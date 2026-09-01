// Test and Example usage of SmartAI micro:bit Extension

// 1. Initialize the AI bridge
SmartAI.initBridge(115200)

// 2. Set up Push-To-Talk on Button A:
// When Button A is held, speech is captured by Mac bridge and sent to Gemini
SmartAI.onButtonAHeldAsk(SmartAI.AIProvider.Gemini)

// 3. When AI responds, speak the response with ElevenLabs and scroll on LEDs
SmartAI.onAIResponse(function (response: string) {
    // Speak using ElevenLabs AI Voice
    SmartAI.speakElevenLabs(response, SmartAI.ElevenLabsVoice.Rachel)
    
    // Scroll the answer across the LED matrix
    SmartAI.scrollAIText(response, 100)
})

// 4. Also allow pressing Button B to ask a fixed question
input.onButtonPressed(Button.B, function () {
    SmartAI.askAI(SmartAI.AIProvider.Claude, "Give me a fun science fact in one sentence.")
})
