(function () {
  "use strict";

  /*
   * ============================================================
   * Tech'nSyntax AI Chat Assistant
   * ============================================================
   *
   * n8n Webhook:
   * https://technsyntaxaichatbot.app.n8n.cloud/webhook/chat
   *
   * Expected request:
   * {
   *   "message": "Hello",
   *   "sessionId": "unique-session-id"
   * }
   *
   * Expected response:
   *
   * {
   *   "reply": "Hello! How can I help you?"
   * }
   *
   * Also supports:
   * {
   *   "output": "..."
   * }
   *
   * or:
   *
   * {
   *   "text": "..."
   * }
   *
   * ============================================================
   */


  /* ------------------------------------------------------------
     CONFIGURATION
     ------------------------------------------------------------ */

  const WEBHOOK_URL =
    "https://technsyntaxaichatbot.app.n8n.cloud/webhook/chat";


  /* ------------------------------------------------------------
     CREATE SESSION ID
     ------------------------------------------------------------ */

  const sessionId =
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
      ? window.crypto.randomUUID()
      : String(Date.now()) +
        "-" +
        Math.random().toString(36).substring(2);


  /* ------------------------------------------------------------
     GET DOM ELEMENTS
     ------------------------------------------------------------ */

  const chatbot =
    document.getElementById("tnsChatbot");

  const toggleButton =
    document.getElementById("tnsChatToggle");

  const closeButton =
    document.getElementById("tnsChatClose");

  const messagesContainer =
    document.getElementById("tnsChatMessages");

  const input =
    document.getElementById("tnsChatInput");

  const sendButton =
    document.getElementById("tnsChatSend");


  /* ------------------------------------------------------------
     SAFETY CHECK
     ------------------------------------------------------------ */

  if (
    !chatbot ||
    !toggleButton ||
    !closeButton ||
    !messagesContainer ||
    !input ||
    !sendButton
  ) {
    console.error(
      "Tech'nSyntax AI Chatbot: Required elements not found."
    );

    return;
  }


  /* ------------------------------------------------------------
     OPEN CHAT
     ------------------------------------------------------------ */

  function openChat() {

    chatbot.classList.add("is-open");

    toggleButton.setAttribute(
      "aria-expanded",
      "true"
    );

    setTimeout(function () {
      input.focus();
    }, 50);
  }


  /* ------------------------------------------------------------
     CLOSE CHAT
     ------------------------------------------------------------ */

  function closeChat() {

    chatbot.classList.remove("is-open");

    toggleButton.setAttribute(
      "aria-expanded",
      "false"
    );

    toggleButton.focus();
  }


  /* ------------------------------------------------------------
     ADD MESSAGE
     ------------------------------------------------------------ */

  function addMessage(text, role) {

    const message = document.createElement("div");

    message.className =
      "tns-chatbot__msg " + role;

    /*
     * textContent is deliberately used instead of innerHTML.
     *
     * This prevents HTML/JavaScript injection from chatbot
     * responses.
     */

    message.textContent =
      String(text);


    messagesContainer.appendChild(
      message
    );


    scrollMessagesToBottom();


    return message;
  }


  /* ------------------------------------------------------------
     SCROLL CHAT TO BOTTOM
     ------------------------------------------------------------ */

  function scrollMessagesToBottom() {

    messagesContainer.scrollTop =
      messagesContainer.scrollHeight;
  }


  /* ------------------------------------------------------------
     SHOW TYPING INDICATOR
     ------------------------------------------------------------ */

  function showTyping() {

    hideTyping();


    const typing =
      document.createElement("div");

    typing.className =
      "tns-chatbot__typing";

    typing.id =
      "tnsChatTyping";


    typing.innerHTML =
      "<span></span>" +
      "<span></span>" +
      "<span></span>";


    messagesContainer.appendChild(
      typing
    );


    scrollMessagesToBottom();
  }


  /* ------------------------------------------------------------
     HIDE TYPING INDICATOR
     ------------------------------------------------------------ */

  function hideTyping() {

    const typing =
      document.getElementById(
        "tnsChatTyping"
      );


    if (typing) {
      typing.remove();
    }
  }


  /* ------------------------------------------------------------
     AUTO GROW TEXTAREA
     ------------------------------------------------------------ */

  function autoGrowInput() {

    input.style.height =
      "auto";


    input.style.height =
      Math.min(
        input.scrollHeight,
        120
      ) + "px";
  }


  /* ------------------------------------------------------------
     SET BUTTON STATE
     ------------------------------------------------------------ */

  function setLoadingState(isLoading) {

    sendButton.disabled =
      isLoading;

    input.disabled =
      isLoading;
  }


  /* ------------------------------------------------------------
     EXTRACT AI RESPONSE
     ------------------------------------------------------------ */

  function extractReply(data) {

    if (!data) {
      return null;
    }


    /*
     * Standard n8n response:
     *
     * {
     *   "reply": "..."
     * }
     */

    if (
      typeof data.reply === "string" &&
      data.reply.trim()
    ) {
      return data.reply.trim();
    }


    /*
     * Alternative:
     *
     * {
     *   "output": "..."
     * }
     */

    if (
      typeof data.output === "string" &&
      data.output.trim()
    ) {
      return data.output.trim();
    }


    /*
     * Alternative:
     *
     * {
     *   "text": "..."
     * }
     */

    if (
      typeof data.text === "string" &&
      data.text.trim()
    ) {
      return data.text.trim();
    }


    /*
     * Some n8n workflows return:
     *
     * {
     *   "response": "..."
     * }
     */

    if (
      typeof data.response === "string" &&
      data.response.trim()
    ) {
      return data.response.trim();
    }


    return null;
  }


  /* ------------------------------------------------------------
     SEND MESSAGE
     ------------------------------------------------------------ */

  async function sendMessage() {

    const text =
      input.value.trim();


    /*
     * Don't send empty messages.
     */

    if (!text) {
      return;
    }


    /*
     * Prevent duplicate requests.
     */

    if (sendButton.disabled) {
      return;
    }


    /*
     * Make sure chat is open.
     */

    openChat();


    /*
     * Show user's message immediately.
     */

    addMessage(
      text,
      "user"
    );


    /*
     * Clear input.
     */

    input.value = "";

    autoGrowInput();


    /*
     * Disable controls.
     */

    setLoadingState(true);


    /*
     * Show typing animation.
     */

    showTyping();


    try {

      /*
       * Send request to n8n.
       */

      const response =
        await fetch(
          WEBHOOK_URL,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              message: text,
              sessionId: sessionId
            })
          }
        );


      /*
       * HTTP error.
       */

      if (!response.ok) {

        const responseText =
          await response
            .text()
            .catch(
              function () {
                return "";
              }
            );


        throw new Error(
          "HTTP " +
          response.status +
          " " +
          response.statusText +
          (
            responseText
              ? " — " +
                responseText.substring(
                  0,
                  300
                )
              : ""
          )
        );
      }


      /*
       * Parse JSON.
       */

      const data =
        await response.json();


      hideTyping();


      /*
       * Extract chatbot response.
       */

      const reply =
        extractReply(data);


      if (reply) {

        addMessage(
          reply,
          "bot"
        );

      } else {

        /*
         * n8n returned JSON but did not
         * return a supported response field.
         */

        addMessage(
          "I received a response from the server, but the reply format was not recognized.",
          "error"
        );


        console.error(
          "Unexpected n8n response:",
          data
        );
      }


    } catch (error) {

      hideTyping();


      /*
       * Browser fetch TypeError commonly means:
       *
       * - CORS
       * - DNS
       * - wrong webhook URL
       * - connection failure
       */

      if (
        error instanceof TypeError
      ) {

        addMessage(
          "Couldn't reach the assistant. Please check the n8n webhook URL and CORS configuration.",
          "error"
        );


        console.error(
          "Tech'nSyntax AI Chat Network/CORS Error:",
          error
        );

      } else {

        addMessage(
          "Couldn't reach the assistant. " +
          error.message,
          "error"
        );


        console.error(
          "Tech'nSyntax AI Chat Error:",
          error
        );
      }


    } finally {

      /*
       * Re-enable controls.
       */

      setLoadingState(false);


      /*
       * Restore focus.
       */

      input.focus();


      autoGrowInput();
    }
  }


  /* ------------------------------------------------------------
     EVENTS
     ------------------------------------------------------------ */


  /*
   * Open chatbot.
   */

  toggleButton.addEventListener(
    "click",
    function () {
      openChat();
    }
  );


  /*
   * Close chatbot.
   */

  closeButton.addEventListener(
    "click",
    function () {
      closeChat();
    }
  );


  /*
   * Send button.
   */

  sendButton.addEventListener(
    "click",
    function () {
      sendMessage();
    }
  );


  /*
   * Enter = send
   *
   * Shift + Enter = new line
   */

  input.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        sendMessage();
      }
    }
  );


  /*
   * Auto-grow textarea.
   */

  input.addEventListener(
    "input",
    function () {
      autoGrowInput();
    }
  );


  /*
   * Escape closes chatbot.
   */

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape" &&
        chatbot.classList.contains(
          "is-open"
        )
      ) {

        closeChat();
      }
    }
  );


  /* ------------------------------------------------------------
     INITIALIZE
     ------------------------------------------------------------ */

  autoGrowInput();


  console.log(
    "Tech'nSyntax AI Chatbot initialized."
  );

})();
