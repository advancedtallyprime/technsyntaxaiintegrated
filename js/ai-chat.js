/**
 * Tech'nSyntax — Custom ElevenLabs AI Chat
 *
 * Text-only custom chat UI using ElevenLabs Agents WebSocket API.
 *
 * No ElevenLabs widget.
 * No API key in frontend.
 * Uses public agent ID.
 *
 * IMPORTANT:
 * The conversation must actually end before ElevenLabs sends
 * the post-call transcription webhook.
 */

(function () {
  'use strict';

  // ------------------------------------------------------------
  // DOM ELEMENTS
  // ------------------------------------------------------------

  var root = document.getElementById('ai-chat');

  if (!root) {
    console.warn('[AI Chat] #ai-chat element not found.');
    return;
  }

  var agentId = root.getAttribute('data-agent-id');

  var messagesEl = document.getElementById('ai-chat-messages');
  var statusEl = document.getElementById('ai-chat-status');
  var formEl = document.getElementById('ai-chat-form');
  var inputEl = document.getElementById('ai-chat-input');

  if (!agentId) {
    console.error('[AI Chat] Missing data-agent-id.');
    return;
  }

  if (!messagesEl || !statusEl || !formEl || !inputEl) {
    console.error('[AI Chat] Required chat elements are missing.');
    return;
  }

  var sendBtn = formEl.querySelector('.ai-chat-send');

  // ------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------

  var socket = null;

  var isConnected = false;
  var isConnecting = false;
  var isEnding = false;

  var reconnectTimer = null;
  var reconnectAttempts = 0;

  var pendingMessages = [];

  var conversationId = null;

  // Used to prevent duplicate agent messages.
  var lastAgentResponseId = null;

  // ------------------------------------------------------------
  // STATUS
  // ------------------------------------------------------------

  function setStatus(text, isError) {
    statusEl.textContent = text || '';

    statusEl.classList.toggle(
      'is-error',
      !!isError
    );
  }

  // ------------------------------------------------------------
  // SCROLL
  // ------------------------------------------------------------

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ------------------------------------------------------------
  // ADD MESSAGE
  // ------------------------------------------------------------

  function addMessage(text, sender) {
    if (!text) return null;

    var bubble = document.createElement('div');

    bubble.className =
      'ai-chat-bubble ai-chat-bubble--' + sender;

    bubble.textContent = text;

    messagesEl.appendChild(bubble);

    scrollToBottom();

    return bubble;
  }

  // ------------------------------------------------------------
  // TYPING INDICATOR
  // ------------------------------------------------------------

  function addTypingIndicator() {
    var existing =
      messagesEl.querySelector('.ai-chat-typing');

    if (existing) {
      return existing;
    }

    var el = document.createElement('div');

    el.className =
      'ai-chat-bubble ai-chat-bubble--agent ai-chat-typing';

    el.innerHTML =
      '<span></span><span></span><span></span>';

    messagesEl.appendChild(el);

    scrollToBottom();

    return el;
  }

  function removeTypingIndicator() {
    var typing =
      messagesEl.querySelector('.ai-chat-typing');

    if (typing) {
      typing.remove();
    }
  }

  // ------------------------------------------------------------
  // END CONVERSATION BUTTON
  // ------------------------------------------------------------

  function createEndButton() {
    var existing =
      document.getElementById('ai-chat-end');

    if (existing) {
      return existing;
    }

    var button = document.createElement('button');

    button.type = 'button';
    button.id = 'ai-chat-end';
    button.className = 'ai-chat-end';
    button.textContent = 'End conversation';

    button.addEventListener(
      'click',
      function () {
        endConversation();
      }
    );

    formEl.parentNode.insertBefore(
      button,
      formEl.nextSibling
    );

    return button;
  }

  function setEndButtonVisible(visible) {
    var button =
      document.getElementById('ai-chat-end');

    if (!button) {
      button = createEndButton();
    }

    button.style.display =
      visible ? 'block' : 'none';
  }

  // ------------------------------------------------------------
  // WEBSOCKET URL
  // ------------------------------------------------------------

  function getWebSocketUrl() {
    return (
      'wss://api.elevenlabs.io/v1/convai/conversation' +
      '?agent_id=' +
      encodeURIComponent(agentId)
    );
  }

  // ------------------------------------------------------------
  // SEND JSON
  // ------------------------------------------------------------

  function sendSocketMessage(payload) {
    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN
    ) {
      return false;
    }

    try {
      socket.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error(
        '[AI Chat] WebSocket send error:',
        error
      );

      return false;
    }
  }

  // ------------------------------------------------------------
  // CONNECTION
  // ------------------------------------------------------------

  function connect() {
    if (isEnding) {
      return;
    }

    if (isConnected || isConnecting) {
      return;
    }

    if (!agentId) {
      setStatus(
        'AI agent configuration is missing.',
        true
      );
      return;
    }

    isConnecting = true;

    setStatus('Connecting to AI assistant...');

    if (sendBtn) {
      sendBtn.disabled = true;
    }

    var wsUrl = getWebSocketUrl();

    console.log(
      '[AI Chat] Connecting to ElevenLabs...'
    );

    try {
      socket = new WebSocket(wsUrl);
    } catch (error) {
      console.error(
        '[AI Chat] WebSocket creation failed:',
        error
      );

      isConnecting = false;

      setStatus(
        'Could not connect to AI assistant.',
        true
      );

      scheduleReconnect();

      return;
    }

    // ----------------------------------------------------------
    // OPEN
    // ----------------------------------------------------------

    socket.onopen = function () {
      console.log(
        '[AI Chat] WebSocket connected.'
      );

      isConnected = true;
      isConnecting = false;

      reconnectAttempts = 0;

      if (sendBtn) {
        sendBtn.disabled = false;
      }

      setStatus('');

      createEndButton();
      setEndButtonVisible(true);

      /*
       * Start ElevenLabs conversation.
       *
       * We intentionally do not override the agent's
       * first message here.
       */

      var initiationPayload = {
        type: 'conversation_initiation_client_data'
      };

      /*
       * Optional user ID.
       *
       * This creates a browser-session identifier which
       * can also be useful later when processing the
       * post-call webhook.
       */

      var storedUserId = null;

      try {
        storedUserId =
          sessionStorage.getItem(
            'technsyntax_ai_user_id'
          );

        if (!storedUserId) {
          storedUserId =
            'web_' +
            Date.now() +
            '_' +
            Math.random()
              .toString(36)
              .substring(2, 10);

          sessionStorage.setItem(
            'technsyntax_ai_user_id',
            storedUserId
          );
        }
      } catch (error) {
        console.warn(
          '[AI Chat] Could not access sessionStorage.'
        );
      }

      initiationPayload.user_id = storedUserId;

      sendSocketMessage(
        initiationPayload
      );

      // Flush messages typed before connection.
      while (
        pendingMessages.length > 0 &&
        isConnected &&
        socket &&
        socket.readyState === WebSocket.OPEN
      ) {
        var message =
          pendingMessages.shift();

        sendSocketMessage({
          type: 'user_message',
          text: message
        });
      }
    };

    // ----------------------------------------------------------
    // MESSAGE
    // ----------------------------------------------------------

    socket.onmessage = function (event) {
      var data;

      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.warn(
          '[AI Chat] Received non-JSON message:',
          event.data
        );

        return;
      }

      console.log(
        '[AI Chat] ElevenLabs event:',
        data
      );

      switch (data.type) {

        // ------------------------------------------------------
        // CONVERSATION STARTED
        // ------------------------------------------------------

        case 'conversation_initiation_metadata': {

          var metadata =
            data.conversation_initiation_metadata_event;

          if (
            metadata &&
            metadata.conversation_id
          ) {
            conversationId =
              metadata.conversation_id;

            root.setAttribute(
              'data-conversation-id',
              conversationId
            );

            console.log(
              '[AI Chat] Conversation ID:',
              conversationId
            );
          }

          removeTypingIndicator();

          break;
        }

        // ------------------------------------------------------
        // USER TRANSCRIPT
        // ------------------------------------------------------

        case 'user_transcript': {

          var userTranscript =
            data.user_transcription_event &&
            data.user_transcription_event
              .user_transcript;

          /*
           * The user message is already displayed
           * immediately when submitMessage() runs.
           *
           * Therefore we do NOT display it again here.
           */

          console.log(
            '[AI Chat] User transcript:',
            userTranscript
          );

          break;
        }

        // ------------------------------------------------------
        // AGENT RESPONSE
        // ------------------------------------------------------

        case 'agent_response': {

          removeTypingIndicator();

          var agentEvent =
            data.agent_response_event;

          if (!agentEvent) {
            break;
          }

          var responseText =
            agentEvent.agent_response;

          var responseId =
            agentEvent.response_id ||
            agentEvent.event_id ||
            null;

          if (
            responseId &&
            responseId === lastAgentResponseId
          ) {
            break;
          }

          lastAgentResponseId =
            responseId;

          if (responseText) {
            addMessage(
              responseText,
              'agent'
            );
          }

          break;
        }

        // ------------------------------------------------------
        // AGENT RESPONSE CORRECTION
        // ------------------------------------------------------

        case 'agent_response_correction': {

          var correction =
            data.agent_response_correction_event;

          if (!correction) {
            break;
          }

          var correctedText =
            correction
              .corrected_agent_response;

          if (!correctedText) {
            break;
          }

          /*
           * Find the latest agent bubble.
           */

          var agentBubbles =
            messagesEl.querySelectorAll(
              '.ai-chat-bubble--agent'
            );

          if (agentBubbles.length > 0) {

            var lastBubble =
              agentBubbles[
                agentBubbles.length - 1
              ];

            /*
             * Don't replace typing indicator.
             */

            if (
              !lastBubble.classList.contains(
                'ai-chat-typing'
              )
            ) {
              lastBubble.textContent =
                correctedText;
            }
          }

          break;
        }

        // ------------------------------------------------------
        // STREAMING CHAT PART
        // ------------------------------------------------------

        case 'agent_chat_response_part': {

          /*
           * Some ElevenLabs configurations may send
           * streaming response parts.
           *
           * We don't render partial chunks because the
           * completed agent_response event gives us a
           * clean final message.
           */

          addTypingIndicator();

          break;
        }

        // ------------------------------------------------------
        // PING
        // ------------------------------------------------------

        case 'ping': {

          var pingEvent =
            data.ping_event;

          if (!pingEvent) {
            break;
          }

          var eventId =
            pingEvent.event_id;

          var pingMs =
            pingEvent.ping_ms || 0;

          setTimeout(
            function () {

              if (
                socket &&
                socket.readyState ===
                  WebSocket.OPEN
              ) {

                sendSocketMessage({
                  type: 'pong',
                  event_id: eventId
                });

              }

            },
            pingMs
          );

          break;
        }

        // ------------------------------------------------------
        // CLIENT ERROR
        // ------------------------------------------------------

        case 'client_error': {

          console.error(
            '[AI Chat] ElevenLabs client error:',
            data
          );

          removeTypingIndicator();

          setStatus(
            'ElevenLabs returned an error. Please try again.',
            true
          );

          break;
        }

        // ------------------------------------------------------
        // INTERRUPTION
        // ------------------------------------------------------

        case 'interruption': {

          removeTypingIndicator();

          console.log(
            '[AI Chat] Agent response interrupted.'
          );

          break;
        }

        // ------------------------------------------------------
        // UNKNOWN EVENT
        // ------------------------------------------------------

        default: {

          /*
           * Keep logging unknown events while debugging.
           */

          console.log(
            '[AI Chat] Unhandled event:',
            data.type
          );

          break;
        }
      }
    };

    // ----------------------------------------------------------
    // ERROR
    // ----------------------------------------------------------

    socket.onerror = function (error) {

      console.error(
        '[AI Chat] WebSocket error:',
        error
      );

      isConnected = false;

      removeTypingIndicator();

      if (!isEnding) {
        setStatus(
          'Connection problem. Retrying...',
          true
        );
      }
    };

    // ----------------------------------------------------------
    // CLOSE
    // ----------------------------------------------------------

    socket.onclose = function (event) {

      console.log(
        '[AI Chat] WebSocket closed.',
        event.code,
        event.reason
      );

      isConnected = false;
      isConnecting = false;

      socket = null;

      removeTypingIndicator();

      if (sendBtn) {
        sendBtn.disabled = true;
      }

      if (isEnding) {

        setStatus(
          'Conversation ended.'
        );

        setEndButtonVisible(false);

        /*
         * IMPORTANT:
         *
         * We do not reconnect after the user explicitly
         * ends the conversation.
         */

        return;
      }

      setStatus(
        'Connection closed. Reconnecting...',
        true
      );

      scheduleReconnect();
    };
  }

  // ------------------------------------------------------------
  // RECONNECT
  // ------------------------------------------------------------

  function scheduleReconnect() {

    if (isEnding) {
      return;
    }

    if (reconnectTimer) {
      return;
    }

    reconnectAttempts++;

    var delay =
      Math.min(
        1000 *
          Math.pow(
            2,
            reconnectAttempts - 1
          ),
        10000
      );

    reconnectTimer =
      setTimeout(
        function () {

          reconnectTimer = null;

          connect();

        },
        delay
      );
  }

  // ------------------------------------------------------------
  // SEND MESSAGE
  // ------------------------------------------------------------

  function sendMessage(text) {

    if (!text) {
      return;
    }

    /*
     * Display user message immediately.
     */

    addMessage(
      text,
      'user'
    );

    addTypingIndicator();

    /*
     * Send immediately if connected.
     */

    if (
      isConnected &&
      socket &&
      socket.readyState ===
        WebSocket.OPEN
    ) {

      var sent =
        sendSocketMessage({
          type: 'user_message',
          text: text
        });

      if (!sent) {
        pendingMessages.push(text);
      }

      return;
    }

    /*
     * Otherwise queue it.
     */

    pendingMessages.push(text);

    connect();
  }

  // ------------------------------------------------------------
  // END CONVERSATION
  // ------------------------------------------------------------

  function endConversation() {

    if (isEnding) {
      return;
    }

    isEnding = true;

    if (reconnectTimer) {
      clearTimeout(
        reconnectTimer
      );

      reconnectTimer = null;
    }

    removeTypingIndicator();

    setStatus(
      'Ending conversation...'
    );

    if (sendBtn) {
      sendBtn.disabled = true;
    }

    setEndButtonVisible(false);

    /*
     * IMPORTANT:
     *
     * Closing the WebSocket tells the server that the
     * browser-side conversation has ended.
     *
     * ElevenLabs can then process the completed conversation
     * and send the post_call_transcription webhook.
     */

    if (
      socket &&
      socket.readyState ===
        WebSocket.OPEN
    ) {

      try {

        socket.close(
          1000,
          'User ended conversation'
        );

      } catch (error) {

        console.error(
          '[AI Chat] Error closing socket:',
          error
        );

      }

    } else {

      setStatus(
        'Conversation ended.'
      );

    }
  }

  // ------------------------------------------------------------
  // FORM SUBMIT
  // ------------------------------------------------------------

  formEl.addEventListener(
    'submit',
    function (event) {

      event.preventDefault();

      if (isEnding) {
        return;
      }

      var text =
        inputEl.value.trim();

      if (!text) {
        return;
      }

      sendMessage(text);

      inputEl.value = '';

      inputEl.focus();
    }
  );

  // ------------------------------------------------------------
  // ENTER KEY
  // ------------------------------------------------------------

  inputEl.addEventListener(
    'keydown',
    function (event) {

      if (
        event.key === 'Enter' &&
        !event.shiftKey
      ) {

        event.preventDefault();

        formEl.requestSubmit();
      }
    }
  );

  // ------------------------------------------------------------
  // PAGE UNLOAD
  // ------------------------------------------------------------

  window.addEventListener(
    'beforeunload',
    function () {

      if (
        socket &&
        socket.readyState ===
          WebSocket.OPEN
      ) {

        try {
          socket.close(
            1000,
            'Page closed'
          );
        } catch (error) {
          // Ignore unload errors.
        }

      }

    }
  );

  // ------------------------------------------------------------
  // START CHAT
  // ------------------------------------------------------------

  createEndButton();

  setEndButtonVisible(false);

  connect();

})();
