# Smart AI & LLM Extension for BBC micro:bit

A MakeCode extension that bridges your BBC micro:bit to **Google Gemini**, **Anthropic Claude**, **OpenAI ChatGPT**, and **ElevenLabs** Speech-to-Text & Text-to-Speech via your Mac's USB data connection.

---

## 🌟 Features

- 🎙️ **Push-to-Talk (Hold Button A)**: Hold Button A to speak into the mic, and automatically transcribe & query your selected AI model.
- 🧠 **Multi-LLM Support**: Ask **Google Gemini**, **Claude 3.5**, or **ChatGPT (GPT-4o)** directly from your micro:bit blocks.
- 🗣️ **ElevenLabs Realistic Voice Synthesis**: Speak AI responses out loud in high-fidelity realistic voices (Rachel, Adam, Antoni, Bella, Josh, etc.).
- 😊 **Animated AI Emotions on 5x5 LED Matrix**: Icons for Thinking (`?`), Listening (`🎤`), Speaking (`🔊`), Happy (`😊`), and Error (`❌`).
- 🔒 **Secure API Keys**: Keys can be configured in your browser Companion Bridge or set via hidden configuration blocks.

---

## 🚀 How to Add This Extension in MakeCode

1. Open [MakeCode for micro:bit](https://makecode.microbit.org/).
2. Create a new project or open an existing one.
3. Click on the **Gear icon (⚙️)** in the top right > **Extensions**.
4. In the search box, paste the URL of this repository or import this folder.
5. The **Smart AI** toolbox category will appear with all the AI, Voice, and Setup blocks!

---

## 🧩 Block Reference

### 1. Push-to-Talk (Hold Button A)
```typescript
SmartAI.onButtonAHeldAsk(SmartAI.AIProvider.Gemini)
```
- **Description**: When you press and hold Button A on your micro:bit, the companion bridge records your voice. When you release Button A, it transcribes the voice query, sends it to Gemini, and triggers the `onAIResponse` block.

### 2. Ask AI Prompt
```typescript
SmartAI.askAI(SmartAI.AIProvider.Claude, "What is the speed of light?")
```
- **Description**: Sends a direct text prompt to Gemini, Claude, or ChatGPT.

### 3. On AI Response Received
```typescript
SmartAI.onAIResponse(function (response: string) {
    SmartAI.speakElevenLabs(response, SmartAI.ElevenLabsVoice.Rachel)
    SmartAI.scrollAIText(response, 100)
})
```
- **Description**: Triggers whenever a reply comes back from the LLM.

### 4. ElevenLabs Realistic Voice
```typescript
SmartAI.speakElevenLabs("Hello from micro:bit AI!", SmartAI.ElevenLabsVoice.Adam)
```
- **Description**: Converts text to lifelike speech using the ElevenLabs API on your Mac bridge.

### 5. Emotion Display
```typescript
SmartAI.showEmotion(SmartAI.AIEmotion.Thinking)
```
- **Description**: Shows animated status icons on the 5x5 micro:bit LED matrix.

---

## 🔌 Serial Protocol Specifications

Communication between micro:bit and Mac Companion App runs at **115200 baud** over USB:

| Direction | Command / Packet Format | Description |
|-----------|-------------------------|-------------|
| micro:bit -> Mac | `CMD:ASK:<PROVIDER>:<PROMPT>` | Request LLM completion |
| micro:bit -> Mac | `CMD:RECORD_START:<PROVIDER>` | Start recording mic audio |
| micro:bit -> Mac | `CMD:RECORD_STOP:<PROVIDER>` | Stop recording, transcribe & send to LLM |
| micro:bit -> Mac | `CMD:TTS:ELEVENLABS:<VOICE>:<TEXT>` | Speak text via ElevenLabs |
| micro:bit -> Mac | `CFG:KEY:<PROVIDER>:<KEY>` | Send API key update |
| micro:bit -> Mac | `EVT:READY:MICROBIT_AI_V1` | Handshake sent upon boot |
| Mac -> micro:bit | `RES:AI:<RESPONSE_TEXT>` | AI response text returned to micro:bit |
| Mac -> micro:bit | `RES:STT:<TRANSCRIPTION>` | Voice transcription returned to micro:bit |
| Mac -> micro:bit | `CMD:EMOTION:<EMOTION_NAME>` | Update micro:bit LED emotion display |
