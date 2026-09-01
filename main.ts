enum AIProvider {
    //% block="Gemini"
    Gemini = 0,
    //% block="OpenRouter"
    OpenRouter = 1,
    //% block="ChatGPT"
    ChatGPT = 2,
    //% block="Claude"
    Claude = 3
}

enum OpenRouterPreset {
    //% block="DeepSeek Chat (deepseek/deepseek-chat)"
    DeepSeekChat = 0,
    //% block="Llama 3.3 70B (meta-llama/llama-3.3-70b-instruct)"
    Llama33 = 1,
    //% block="Gemini 2.0 Flash (google/gemini-2.0-flash-001)"
    Gemini2Flash = 2,
    //% block="GPT-4o Mini (openai/gpt-4o-mini)"
    GPT4oMini = 3,
    //% block="Claude 3.5 Sonnet (anthropic/claude-3.5-sonnet)"
    Claude35Sonnet = 4,
    //% block="Mistral Large (mistralai/mistral-large-2407)"
    MistralLarge = 5,
    //% block="Qwen 2.5 72B (qwen/qwen-2.5-72b-instruct)"
    Qwen25 = 6
}

enum ElevenLabsVoice {
    //% block="Rachel (Female)"
    Rachel = 0,
    //% block="Adam (Male)"
    Adam = 1,
    //% block="Antoni (Male)"
    Antoni = 2,
    //% block="Bella (Female)"
    Bella = 3,
    //% block="Josh (Male)"
    Josh = 4
}

enum AIEmotion {
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

/**
 * Smart AI & LLM Extension for BBC micro:bit
 */
//% weight=100 color="#7B2CBF" icon="\uf0e7" block="Smart AI"
namespace SmartAI {
    let isInitialized = false;
    let lastResponseText = "";
    let lastSpeechTranscript = "";
    let responseHandler: (response: string) => void = null;
    let speechHandler: (transcript: string) => void = null;

    function trimString(text: string): string {
        if (!text || text.length == 0) return "";
        let s = 0;
        let e = text.length - 1;
        while (s <= e) {
            let ch = text.charCodeAt(s);
            if (ch == 32 || ch == 9 || ch == 10 || ch == 13) {
                s++;
            } else {
                break;
            }
        }
        while (e >= s) {
            let ch = text.charCodeAt(e);
            if (ch == 32 || ch == 9 || ch == 10 || ch == 13) {
                e--;
            } else {
                break;
            }
        }
        if (s > e) return "";
        return text.substr(s, e - s + 1);
    }

    /**
     * Initializes the AI Serial Bridge with the Mac Companion Server.
     */
    //% blockId="smart_ai_init" block="initialize AI Bridge with baud rate %baud"
    //% baud.defl=115200
    //% weight=100
    export function initBridge(baud: number = 115200): void {
        if (isInitialized) return;
        serial.redirect(SerialPin.USB_TX, SerialPin.USB_RX, baud);
        isInitialized = true;
        
        serial.onDataReceived(serial.delimiters(Delimiters.NewLine), function () {
            let raw = serial.readLine();
            let line = trimString(raw);
            if (line.length == 0) return;

            if (line.indexOf("RES:AI:") == 0) {
                lastResponseText = line.substr(7);
                showEmotion(AIEmotion.Happy);
                if (responseHandler) {
                    responseHandler(lastResponseText);
                }
            } else if (line.indexOf("RES:STT:") == 0) {
                lastSpeechTranscript = line.substr(8);
                if (speechHandler) {
                    speechHandler(lastSpeechTranscript);
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

        serial.writeLine("EVT:READY:MICROBIT_AI_V1");
    }

    function checkInit(): void {
        if (!isInitialized) {
            initBridge(115200);
        }
    }

    /**
     * Set the API key for Gemini, OpenRouter, ChatGPT, or Claude directly from your micro:bit!
     * @param provider AI service
     * @param key Your API Key
     */
    //% blockId="smart_ai_set_api_key"
    //% block="set %provider API key to %key"
    //% key.defl="AIzaSy..."
    //% weight=99
    export function setApiKey(provider: AIProvider, key: string): void {
        checkInit();
        let provStr = providerToString(provider);
        serial.writeLine("CFG:KEY:" + provStr + ":" + key);
    }

    /**
     * Select an OpenRouter model preset (DeepSeek, Llama 3.3, Gemini 2.0, GPT-4o Mini, Claude, etc.).
     * @param model Model preset
     */
    //% blockId="smart_ai_set_openrouter_preset"
    //% block="set OpenRouter model preset %model"
    //% weight=98
    export function setOpenRouterPreset(model: OpenRouterPreset): void {
        checkInit();
        let modelStr = openRouterPresetToString(model);
        serial.writeLine("CFG:MODEL:OPENROUTER:" + modelStr);
    }

    /**
     * Set any custom OpenRouter model string (e.g. deepseek/deepseek-chat, meta-llama/llama-3.3-70b-instruct).
     * @param modelName Full OpenRouter model ID
     */
    //% blockId="smart_ai_set_custom_openrouter_model"
    //% block="set OpenRouter custom model %modelName"
    //% modelName.defl="deepseek/deepseek-chat"
    //% weight=97
    export function setOpenRouterCustomModel(modelName: string): void {
        checkInit();
        serial.writeLine("CFG:MODEL:OPENROUTER:" + modelName);
    }

    /**
     * Voice push-to-talk: When Button A is held, capture voice, transcribe it, and ask selected AI.
     * @param provider LLM Provider to ask
     */
    //% blockId="smart_ai_button_a_listen_ask"
    //% block="push-to-talk: on Button A held record speech and ask %provider"
    //% weight=95
    export function onButtonAHeldAsk(provider: AIProvider): void {
        checkInit();
        input.onButtonPressed(Button.A, function () {
            showEmotion(AIEmotion.Listening);
            serial.writeLine("CMD:RECORD_START:" + providerToString(provider));
            
            while (input.buttonIsPressed(Button.A)) {
                basic.pause(50);
            }
            
            showEmotion(AIEmotion.Thinking);
            serial.writeLine("CMD:RECORD_STOP:" + providerToString(provider));
        });
    }

    /**
     * Ask an AI Model (Gemini, OpenRouter, Claude, ChatGPT) a question or prompt.
     * @param provider LLM Provider
     * @param prompt The text prompt or query
     */
    //% blockId="smart_ai_ask"
    //% block="ask %provider with prompt %prompt"
    //% prompt.defl="Tell me a fun fact"
    //% weight=90
    export function askAI(provider: AIProvider, prompt: string): void {
        checkInit();
        showEmotion(AIEmotion.Thinking);
        let provStr = providerToString(provider);
        serial.writeLine("CMD:ASK:" + provStr + ":" + prompt);
    }

    /**
     * Event triggered when an AI response arrives from Gemini, OpenRouter, Claude, or ChatGPT.
     */
    //% blockId="smart_ai_on_response"
    //% block="on AI response received $response"
    //% draggableParameters="reporter"
    //% weight=85
    export function onAIResponse(handler: (response: string) => void): void {
        checkInit();
        responseHandler = handler;
    }

    /**
     * Returns the most recent AI text response received.
     */
    //% blockId="smart_ai_last_response"
    //% block="last AI response text"
    //% weight=80
    export function getLastResponse(): string {
        return lastResponseText;
    }

    /**
     * Speak text using ElevenLabs realistic AI voice.
     * @param text The text to speak
     * @param voice Voice preset
     */
    //% blockId="smart_ai_speak_elevenlabs"
    //% block="speak %text with ElevenLabs voice %voice"
    //% text.defl="Hello from micro:bit!"
    //% weight=75
    export function speakElevenLabs(text: string, voice: ElevenLabsVoice = ElevenLabsVoice.Rachel): void {
        checkInit();
        showEmotion(AIEmotion.Speaking);
        let voiceName = voiceToString(voice);
        serial.writeLine("CMD:TTS:ELEVENLABS:" + voiceName + ":" + text);
    }

    /**
     * Start listening / recording microphone audio.
     */
    //% blockId="smart_ai_start_listening"
    //% block="start listening to microphone"
    //% weight=70
    export function startListening(): void {
        checkInit();
        showEmotion(AIEmotion.Listening);
        serial.writeLine("CMD:RECORD_START:DEFAULT");
    }

    /**
     * Stop listening and send recorded audio for transcription.
     */
    //% blockId="smart_ai_stop_listening"
    //% block="stop listening and transcribe"
    //% weight=68
    export function stopListening(): void {
        checkInit();
        showEmotion(AIEmotion.Thinking);
        serial.writeLine("CMD:RECORD_STOP:DEFAULT");
    }

    /**
     * Event triggered when speech is transcribed to text.
     */
    //% blockId="smart_ai_on_speech_recognized"
    //% block="on speech recognized $transcript"
    //% draggableParameters="reporter"
    //% weight=65
    export function onSpeechRecognized(handler: (transcript: string) => void): void {
        checkInit();
        speechHandler = handler;
    }

    /**
     * Display an AI emotion/status on the micro:bit 5x5 LED matrix.
     * @param emotion Emotion or state
     */
    //% blockId="smart_ai_show_emotion"
    //% block="show AI emotion %emotion"
    //% weight=60
    export function showEmotion(emotion: AIEmotion): void {
        if (emotion == AIEmotion.Thinking) {
            basic.showLeds(`
                . # # # .
                . . . # .
                . . # # .
                . . . . .
                . . # . .
            `);
        } else if (emotion == AIEmotion.Listening) {
            basic.showLeds(`
                . . # . .
                . # # # .
                . # # # .
                . . # . .
                # # # # #
            `);
        } else if (emotion == AIEmotion.Happy) {
            basic.showIcon(IconNames.Happy);
        } else if (emotion == AIEmotion.Surprised) {
            basic.showIcon(IconNames.Surprised);
        } else if (emotion == AIEmotion.Speaking) {
            basic.showLeds(`
                . . # . .
                . # . # .
                # . # . #
                . # . # .
                . . # . .
            `);
        } else if (emotion == AIEmotion.Error) {
            basic.showIcon(IconNames.No);
        } else if (emotion == AIEmotion.Robot) {
            basic.showLeds(`
                . # . # .
                # # # # #
                # . # . #
                # # # # #
                . # . # .
            `);
        }
    }

    /**
     * Scroll AI response text across micro:bit 5x5 LED matrix with custom delay.
     * @param text Text string to scroll
     * @param speed Scroll delay per frame in milliseconds
     */
    //% blockId="smart_ai_scroll_text"
    //% block="scroll AI response %text with speed (ms) %speed"
    //% text.defl="Hello from Gemini!"
    //% speed.defl=120
    //% weight=50
    export function scrollAIText(text: string, speed: number = 120): void {
        basic.showString(text, speed);
    }

    function providerToString(provider: AIProvider): string {
        if (provider == AIProvider.OpenRouter) return "OPENROUTER";
        if (provider == AIProvider.Claude) return "CLAUDE";
        if (provider == AIProvider.ChatGPT) return "CHATGPT";
        return "GEMINI";
    }

    function openRouterPresetToString(model: OpenRouterPreset): string {
        if (model == OpenRouterPreset.DeepSeekChat) return "deepseek/deepseek-chat";
        if (model == OpenRouterPreset.Llama33) return "meta-llama/llama-3.3-70b-instruct";
        if (model == OpenRouterPreset.Gemini2Flash) return "google/gemini-2.0-flash-001";
        if (model == OpenRouterPreset.GPT4oMini) return "openai/gpt-4o-mini";
        if (model == OpenRouterPreset.Claude35Sonnet) return "anthropic/claude-3.5-sonnet";
        if (model == OpenRouterPreset.MistralLarge) return "mistralai/mistral-large-2407";
        if (model == OpenRouterPreset.Qwen25) return "qwen/qwen-2.5-72b-instruct";
        return "deepseek/deepseek-chat";
    }

    function voiceToString(voice: ElevenLabsVoice): string {
        if (voice == ElevenLabsVoice.Adam) return "Adam";
        if (voice == ElevenLabsVoice.Antoni) return "Antoni";
        if (voice == ElevenLabsVoice.Bella) return "Bella";
        if (voice == ElevenLabsVoice.Josh) return "Josh";
        return "Rachel";
    }
}
