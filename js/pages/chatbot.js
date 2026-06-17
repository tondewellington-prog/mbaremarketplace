async function sendMessage() {
    const inputField = document.getElementById("user-input");
    const message = inputField.value.trim();
    if (!message) return;

    // Display user message
    appendMessage("You", message, "user");
    inputField.value = "";

    try {
        // Example: Call an AI API (replace with your API endpoint)
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "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" // Replace with your key
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: message }]
            })
        });

        const data = await response.json();
        const botReply = data.choices?.[0]?.message?.content || "No response";
        appendMessage("Bot", botReply, "bot");

    } catch (error) {
        appendMessage("Bot", "Error: " + error.message, "bot");
    }
}

function appendMessage(sender, text, className) {
    const messagesDiv = document.getElementById("messages");
    const messageEl = document.createElement("div");
    messageEl.classList.add("message", className);
    messageEl.innerHTML = `<strong>${sender}:</strong> ${text}`;
    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("user-input").addEventListener("keypress", function(e) {
    if (e.key === "Enter") sendMessage();
});
