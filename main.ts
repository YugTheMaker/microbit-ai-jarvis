/**
 * Smart AI & LLM Extension for BBC micro:bit
 * Connects micro:bit to Gemini, Claude, ChatGPT, and ElevenLabs via USB Mac Bridge.
 */

//% color="#7B2CBF" icon="\uf0e7" block="Smart AI"
namespace SmartAI {
    export enum AIProvider {
        //% block="Gemini"
        Gemini = 0,
        //% block="Claude"
        Claude = 1,
        //% block="ChatGPT"
        ChatGPT = 2
    }

    export enum ElevenLabsVoice {
        //% block="Rachel (Female)"
        Rachel = 0,
        //% block="Adam (Male)"
        Adam = 1,
        //% block="Antoni (Male)"
        Antoni = 2,
        //% block="Bella (Female)"
        Bella = 3,
        //% block="Josh (Male)"
        Josh = 4,
        //% block="Default Voice"
        Default = 5
    }

    export enum AIEmotion {
        //% block="Thinking"
        Thinking = 0,
        //% block="Listening"
        Listening = 1,
        //% block="Happy"
        Happy = 2,
        //% block="Surprised"
        Surprised = 3,
        //% block="Speaking"
        Speaking = 4,
        //% block="Error"
        Error = 5,
        //% block="Robot"
        Robot = 6
    }

    let isInitialized = false;
    let lastResponseText = "";
    let lastSpeechTranscript = "";
    let aiResponseHandler: (response: string) => void = null;
    let speechRecognizedHandler: (transcript: string) => void = null;
    let isListening = false;

    /**
     * Initializes the AI Serial Bridge with the Mac Companion Server.
     */
    //% blockId=smart_ai_init
    //% block="initialize AI Bridge with baud rate %baud"
    //% baud.defl=115200
    //% weight=100
    //% subcategory="Setup"
    export function initBridge(baud: number = 115200): void {
        if (isInitialized) return;
        serial.redirect(SerialPin.USB_TX, SerialPin.USB_RX, baud);
        isInitialized = true;
        
        // Listen for incoming serial commands from Mac bridge
        serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
            let line = serial.readLine().trim();
            if (line.length == 0) return;

            if (line.indexOf("RES:AI:") == 0) {
                lastResponseText = line.substr(7);
                showEmotion(AIEmotion.Happy);
                if (aiResponseHandler) {
                    aiResponseHandler(lastResponseText);
                }
            } else if (line.indexOf("RES:STT:") == 0) {
                lastSpeechTranscript = line.substr(8);
                if (speechRecognizedHandler) {
                    speechRecognizedHandler(lastSpeechTranscript);
                }
            } else if (line.indexOf("CMD:EMOTION:") == 0) {
                let emo = line.substr(12);
                if (emo == "THINKING") showEmotion(AIEmotion.Thinking);
                else if (emo == "LISTENING") showEmotion(AIEmotion.Listening);
                else if (emo == "HAPPY") showEmotion(AIEmotion.Happy);
                else if (emo == "ERROR") showEmotion(AIEmotion.Error);
                else if (emo == "SPEAKING") showEmotion(AIEmotion.Speaking);
            }
        });

        // Notify bridge that micro:bit is connected
        serial.writeLine("EVT:READY:MICROBIT_AI_V1");
    }

    function ensureInit() {
        if (!isInitialized) {
            initBridge(115200);
        }
    }

    /**
     * Set the API key for a chosen AI provider (or manage it inside the Mac Companion Bridge).
     * @param provider LLM provider (Gemini, Claude, ChatGPT, ElevenLabs)
     * @param apiKey Your private API Key
     */
    //% blockId=smart_ai_set_api_key
    //% block="set %provider API key to %apiKey (hidden)"
    //% apiKey.defl="AIzaSy..."
    //% weight=95
    //% subcategory="Setup"
    export function setAPIKey(provider: AIProvider, apiKey: string): void {
        ensureInit();
        let provStr = providerToString(provider);
        serial.writeLine("CFG:KEY:" + provStr + ":" + apiKey);
    }

    /**
     * Set ElevenLabs Voice API Key
     * @param apiKey ElevenLabs API Key (Free tier supported)
     */
    //% blockId=smart_ai_set_elevenlabs_key
    //% block="set ElevenLabs API key to %apiKey (hidden)"
    //% apiKey.defl="xi-api-key..."
    //% weight=94
    //% subcategory="Setup"
    export function setElevenLabsKey(apiKey: string): void {
        ensureInit();
        serial.writeLine("CFG:KEY:ELEVENLABS:" + apiKey);
    }

    /**
     * Ask an AI Model (Gemini, Claude, ChatGPT) a question or prompt.
     * @param provider LLM Provider
     * @param prompt The text prompt or query
     */
    //% blockId=smart_ai_ask
    //% block="ask %provider with prompt %prompt"
    //% prompt.defl="Tell me a joke"
    //% weight=90
    //% subcategory="AI Queries"
    export function askAI(provider: AIProvider, prompt: string): void {
        ensureInit();
        showEmotion(AIEmotion.Thinking);
        let provStr = providerToString(provider);
        serial.writeLine("CMD:ASK:" + provStr + ":" + prompt);
    }

    /**
     * Event triggered when an AI response arrives from Gemini, Claude, or ChatGPT.
     */
    //% blockId=smart_ai_on_response
    //% block="on AI response received $response"
    //% draggableParameters="reporter"
    //% weight=85
    //% subcategory="AI Queries"
    export function onAIResponse(handler: (response: string) => void): void {
        ensureInit();
        aiResponseHandler = handler;
    }

    /**
     * Returns the most recent AI text response received.
     */
    //% blockId=smart_ai_last_response
    //% block="last AI response text"
    //% weight=80
    //% subcategory="AI Queries"
    export function getLastResponse(): string {
        return lastResponseText;
    }

    /**
     * Voice push-to-talk: When Button A is held, capture voice, transcribe it, and ask AI.
     * @param provider LLM Provider to ask
     */
    //% blockId=smart_ai_button_a_listen_ask
    //% block="push-to-talk: on Button A held, record speech and ask %provider"
    //% weight=88
    //% subcategory="Voice & Mic"
    export function onButtonAHeldAsk(provider: AIProvider): void {
        ensureInit();
        input.onButtonPressed(Button.A, function () {
            showEmotion(AIEmotion.Listening);
            serial.writeLine("CMD:RECORD_START:" + providerToString(provider));
            isListening = true;
            
            // Loop while button A is still held
            while (input.buttonIsPressed(Button.A)) {
                basic.pause(50);
            }
            
            // Button released
            showEmotion(AIEmotion.Thinking);
            serial.writeLine("CMD:RECORD_STOP:" + providerToString(provider));
            isListening = false;
        });
    }

    /**
     * Start listening / recording microphone audio on Mac / micro:bit.
     */
    //% blockId=smart_ai_start_listening
    //% block="start listening to microphone"
    //% weight=75
    //% subcategory="Voice & Mic"
    export function startListening(): void {
        ensureInit();
        showEmotion(AIEmotion.Listening);
        serial.writeLine("CMD:RECORD_START:DEFAULT");
        isListening = true;
    }

    /**
     * Stop listening and send recorded audio for transcription.
     */
    //% blockId=smart_ai_stop_listening
    //% block="stop listening and transcribe"
    //% weight=74
    //% subcategory="Voice & Mic"
    export function stopListening(): void {
        ensureInit();
        showEmotion(AIEmotion.Thinking);
        serial.writeLine("CMD:RECORD_STOP:DEFAULT");
        isListening = false;
    }

    /**
     * Event triggered when speech is transcribed to text.
     */
    //% blockId=smart_ai_on_speech_recognized
    //% block="on speech recognized $transcript"
    //% draggableParameters="reporter"
    //% weight=72
    //% subcategory="Voice & Mic"
    export function onSpeechRecognized(handler: (transcript: string) => void): void {
        ensureInit();
        speechRecognizedHandler = handler;
    }

    /**
     * Speak text using ElevenLabs realistic AI voice.
     * @param text The text to speak
     * @param voice Voice preset
     */
    //% blockId=smart_ai_speak_elevenlabs
    //% block="speak %text with ElevenLabs voice %voice"
    //% text.defl="Hello! I am your micro:bit AI assistant."
    //% weight=70
    //% subcategory="Voice & Mic"
    export function speakElevenLabs(text: string, voice: ElevenLabsVoice = ElevenLabsVoice.Rachel): void {
        ensureInit();
        showEmotion(AIEmotion.Speaking);
        let voiceName = voiceToString(voice);
        serial.writeLine("CMD:TTS:ELEVENLABS:" + voiceName + ":" + text);
    }

    /**
     * Display an AI emotion/status on the micro:bit 5x5 LED matrix.
     * @param emotion Emotion or state
     */
    //% blockId=smart_ai_show_emotion
    //% block="show AI emotion %emotion"
    //% weight=60
    //% subcategory="Display"
    export function showEmotion(emotion: AIEmotion): void {
        switch (emotion) {
            case AIEmotion.Thinking:
                basic.showLeds(`
                    . # # # .
                    . . . # .
                    . . # # .
                    . . . . .
                    . . # . .
                `);
                break;
            case AIEmotion.Listening:
                basic.showLeds(`
                    . . # . .
                    . # # # .
                    . # # # .
                    . . # . .
                    # # # # #
                `);
                break;
            case AIEmotion.Happy:
                basic.showIcon(IconNames.Happy);
                break;
            case AIEmotion.Surprised:
                basic.showIcon(IconNames.Surprised);
                break;
            case AIEmotion.Speaking:
                basic.showLeds(`
                    . . # . .
                    . # . # .
                    # . # . #
                    . # . # .
                    . . # . .
                `);
                break;
            case AIEmotion.Error:
                basic.showIcon(IconNames.No);
                break;
            case AIEmotion.Robot:
                basic.showLeds(`
                    . # . # .
                    # # # # #
                    # . # . #
                    # # # # #
                    . # . # .
                `);
                break;
        }
    }

    /**
     * Scroll AI response text across micro:bit 5x5 LED matrix with custom delay.
     * @param text Text string to scroll
     * @param speed Scroll delay per frame in milliseconds
     */
    //% blockId=smart_ai_scroll_text
    //% block="scroll AI response %text with speed (ms) %speed"
    //% text.defl="Hello from Gemini!"
    //% speed.defl=120
    //% weight=50
    //% subcategory="Display"
    export function scrollAIText(text: string, speed: number = 120): void {
        basic.showString(text, speed);
    }

    function providerToString(provider: AIProvider): string {
        switch (provider) {
            case AIProvider.Gemini: return "GEMINI";
            case AIProvider.Claude: return "CLAUDE";
            case AIProvider.ChatGPT: return "CHATGPT";
            default: return "GEMINI";
        }
    }

    function voiceToString(voice: ElevenLabsVoice): string {
        switch (voice) {
            case ElevenLabsVoice.Rachel: return "Rachel";
            case ElevenLabsVoice.Adam: return "Adam";
            case ElevenLabsVoice.Antoni: return "Antoni";
            case ElevenLabsVoice.Bella: return "Bella";
            case ElevenLabsVoice.Josh: return "Josh";
            default: return "Rachel";
        }
    }
}
