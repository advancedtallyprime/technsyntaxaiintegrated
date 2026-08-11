/**
 * Custom AI chat client for the contact page.
 * Connects directly to the ElevenLabs Agents WebSocket API using the
 * public agent-id (no API key needed — the agent has authentication
 * disabled). Text-only conversation: no mic, no audio playback.
 *
 * Docs: https://elevenlabs.io/docs/eleven-agents/libraries/web-sockets
 */
(function () {
  'use strict';

  var root = document.getElementById('ai-chat');
  if (!root) return;

  var agentId = root.getAttribute('data-agent-id');
  var messagesEl = document.getElementById('ai-chat-messages');
  var statusEl = document.getElementById('ai-chat-status');
  var formEl = document.getElementById('ai-chat-form');
  var inputEl = document.getElementById('ai-chat-input');
  var sendBtn = formEl.querySelector('.ai-chat-send');

  var socket = null;
  var isConnected = false;
  var isConnecting = false;
  var pendingMessages = [];
  var currentAgentBubble = null; // for streaming partial responses

  function setStatus(text, isError) {
    statusEl.textContent = text || '';
    statusEl.classList.toggle('is-error', !!isError);
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(text, sender) {
    var bubble = document.createElement('div');
    bubble.className = 'ai-chat-bubble ai-chat-bubble--' + sender;
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    scrollToBottom();
    return bubble;
  }

  function addTypingIndicator() {
    var existing = messagesEl.querySelector('.ai-chat-typing');
    if (existing) return existing;
    var el = document.createElement('div');
    el.className = 'ai-chat-bubble ai-chat-bubble--agent ai-chat-typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  }

  function connect() {
    if (isConnected || isConnecting) return;
    isConnecting = true;
    setStatus('Connecting…');
    sendBtn.disabled = true;

    var wsUrl = 'wss://api.elevenlabs.io/v1/convai/conversation?agent_id=' + encodeURIComponent(agentId);

    try {
      socket = new WebSocket(wsUrl);
    } catch (err) {
      isConnecting = false;
      setStatus('Could not connect. Please try again later.', true);
      return;
    }

    socket.onopen = function () {
      isConnected = true;
      isConnecting = false;
      sendBtn.disabled = false;
      setStatus('');
      socket.send(JSON.stringify({ type: 'conversation_initiation_client_data' }));
      addTypingIndicator(); // shown until the agent's first message arrives

      // Flush any messages the user typed before the connection was ready.
      while (pendingMessages.length) {
        var msg = pendingMessages.shift();
        socket.send(JSON.stringify({ type: 'user_message', text: msg }));
      }
    };

    socket.onmessage = function (event) {
      var data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      switch (data.type) {
        case 'ping': {
          var pingMs = (data.ping_event && data.ping_event.ping_ms) || 0;
          var eventId = data.ping_event && data.ping_event.event_id;
          setTimeout(function () {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'pong', event_id: eventId }));
            }
          }, pingMs);
          break;
        }

        case 'agent_response': {
          var typing = messagesEl.querySelector('.ai-chat-typing');
          if (typing) typing.remove();
          var text = data.agent_response_event && data.agent_response_event.agent_response;
          if (text) addMessage(text, 'agent');
          currentAgentBubble = null;
          break;
        }

        case 'agent_response_correction': {
          var corrected = data.agent_response_correction_event && data.agent_response_correction_event.corrected_agent_response;
          var lastAgentBubble = messagesEl.querySelector('.ai-chat-bubble--agent:last-of-type');
          if (corrected && lastAgentBubble) lastAgentBubble.textContent = corrected;
          break;
        }

        default:
          break;
      }
    };

    socket.onerror = function () {
      setStatus('Connection issue — trying to reconnect…', true);
    };

    socket.onclose = function () {
      isConnected = false;
      isConnecting = false;
      socket = null;
      sendBtn.disabled = true;
      var typing = messagesEl.querySelector('.ai-chat-typing');
      if (typing) typing.remove();
    };
  }

  function sendMessage(text) {
    addMessage(text, 'user');
    addTypingIndicator();

    if (isConnected && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'user_message', text: text }));
    } else {
      pendingMessages.push(text);
      connect();
    }
  }

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = inputEl.value.trim();
    if (!text) return;
    sendMessage(text);
    inputEl.value = '';
    inputEl.focus();
  });

  // Open the connection as soon as the chat is visible. The agent's own
  // configured first message will arrive automatically as an agent_response
  // event once the conversation is initiated — no need to fake a greeting
  // here (doing so caused a duplicate "Hi!" bubble on load).
  connect();
})();
