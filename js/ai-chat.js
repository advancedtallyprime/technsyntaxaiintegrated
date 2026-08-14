/**
 * Tech'nSyntax — n8n AI Chat
 *
 * Frontend chatbot
 * HTML/CSS UI remains the same.
 *
 * Architecture:
 *
 * Contact.html
 *      ↓
 * ai-chat.js
 *      ↓
 * localStorage
 *      ↓
 * n8n Webhook
 *      ↓
 * AI Agent + Gemini
 *      ↓
 * Response
 *      ↓
 * ai-chat.js
 *      ↓
 * Chat UI
 */

(function () {
  'use strict';

  // ============================================================
  // CONFIGURATION
  // ============================================================

  /*
   * IMPORTANT:
   * Replace this with your FINAL n8n Production Webhook URL.
   *
   * Example:
   * https://your-n8n-domain.com/webhook/technsyntax-chat
   */
  var N8N_WEBHOOK_URL =
    'https://technsyntaxaichatbot.app.n8n.cloud/webhook/technsyntax-ai-chat-v2';


  /*
   * localStorage keys
   */
  var STORAGE_KEYS = {
    USER_ID: 'technsyntax_ai_user_id',
    PROFILE: 'technsyntax_ai_profile',
    CONVERSATION: 'technsyntax_ai_conversation'
  };


  // ============================================================
  // DOM ELEMENTS
  // ============================================================

  var root = document.getElementById('ai-chat');

  if (!root) {
    console.warn('[AI Chat] #ai-chat element not found.');
    return;
  }

  var messagesEl =
    document.getElementById('ai-chat-messages');

  var statusEl =
    document.getElementById('ai-chat-status');

  var formEl =
    document.getElementById('ai-chat-form');

  var inputEl =
    document.getElementById('ai-chat-input');

  if (
    !messagesEl ||
    !statusEl ||
    !formEl ||
    !inputEl
  ) {
    console.error(
      '[AI Chat] Required chat elements are missing.'
    );

    return;
  }

  var sendBtn =
    formEl.querySelector('.ai-chat-send');


  // ============================================================
  // STATE
  // ============================================================

  var isSending = false;
  var isEnding = false;

  var userId = null;

  var userProfile = {};

  var conversationHistory = [];

  var conversationId = null;


  // ============================================================
  // STATUS
  // ============================================================

  function setStatus(text, isError) {

    statusEl.textContent = text || '';

    statusEl.classList.toggle(
      'is-error',
      !!isError
    );
  }


  // ============================================================
  // SCROLL
  // ============================================================

  function scrollToBottom() {

    messagesEl.scrollTop =
      messagesEl.scrollHeight;
  }


  // ============================================================
  // ADD MESSAGE
  // ============================================================

  function addMessage(text, sender) {

    if (!text) {
      return null;
    }

    var bubble =
      document.createElement('div');

    bubble.className =
      'ai-chat-bubble ai-chat-bubble--' +
      sender;

    bubble.textContent = text;

    messagesEl.appendChild(bubble);

    scrollToBottom();

    return bubble;
  }


  // ============================================================
  // TYPING INDICATOR
  // ============================================================

  function addTypingIndicator() {

    var existing =
      messagesEl.querySelector(
        '.ai-chat-typing'
      );

    if (existing) {
      return existing;
    }

    var el =
      document.createElement('div');

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
      messagesEl.querySelector(
        '.ai-chat-typing'
      );

    if (typing) {
      typing.remove();
    }
  }


  // ============================================================
  // END CHAT BUTTON
  // ============================================================

  function createEndButton() {

    var existing =
      document.getElementById(
        'ai-chat-end'
      );

    if (existing) {

      if (
        !existing.dataset.aiChatBound
      ) {

        existing.addEventListener(
          'click',
          function () {
            endConversation();
          }
        );

        existing.dataset.aiChatBound =
          'true';
      }

      return existing;
    }


    var button =
      document.createElement('button');

    button.type = 'button';

    button.id = 'ai-chat-end';

    button.className =
      'ai-chat-end';

    button.textContent =
      'End conversation';


    button.addEventListener(
      'click',
      function () {
        endConversation();
      }
    );


    button.dataset.aiChatBound =
      'true';


    formEl.parentNode.insertBefore(
      button,
      formEl.nextSibling
    );


    return button;
  }


  function setEndButtonVisible(
    visible
  ) {

    var button =
      document.getElementById(
        'ai-chat-end'
      );

    if (!button) {
      button =
        createEndButton();
    }

    button.style.display =
      visible
        ? 'block'
        : 'none';
  }


  // ============================================================
  // GENERATE USER ID
  // ============================================================

  function generateUserId() {

    return (
      'web_' +
      Date.now() +
      '_' +
      Math.random()
        .toString(36)
        .substring(2, 12)
    );
  }


  // ============================================================
  // GET / CREATE USER ID
  // ============================================================

  function initializeUserId() {

    try {

      userId =
        localStorage.getItem(
          STORAGE_KEYS.USER_ID
        );


      if (!userId) {

        userId =
          generateUserId();

        localStorage.setItem(
          STORAGE_KEYS.USER_ID,
          userId
        );
      }


    } catch (error) {

      console.warn(
        '[AI Chat] localStorage unavailable.',
        error
      );

      /*
       * Fallback:
       * Generate temporary ID.
       */

      userId =
        generateUserId();
    }
  }


  // ============================================================
  // LOAD USER PROFILE
  // ============================================================

  function loadUserProfile() {

    try {

      var storedProfile =
        localStorage.getItem(
          STORAGE_KEYS.PROFILE
        );


      if (storedProfile) {

        userProfile =
          JSON.parse(
            storedProfile
          );

      } else {

        userProfile = {};
      }


    } catch (error) {

      console.warn(
        '[AI Chat] Could not load user profile.',
        error
      );

      userProfile = {};
    }
  }


  // ============================================================
  // SAVE USER PROFILE
  // ============================================================

  function saveUserProfile(
    profile
  ) {

    if (!profile) {
      return;
    }


    userProfile =
      Object.assign(
        {},
        userProfile,
        profile
      );


    try {

      localStorage.setItem(
        STORAGE_KEYS.PROFILE,
        JSON.stringify(
          userProfile
        )
      );

    } catch (error) {

      console.warn(
        '[AI Chat] Could not save user profile.',
        error
      );
    }
  }


  // ============================================================
  // LOAD CONVERSATION
  // ============================================================

  function loadConversation() {

    try {

      var storedConversation =
        localStorage.getItem(
          STORAGE_KEYS.CONVERSATION
        );


      if (
        storedConversation
      ) {

        conversationHistory =
          JSON.parse(
            storedConversation
          );


        if (
          !Array.isArray(
            conversationHistory
          )
        ) {

          conversationHistory =
            [];
        }

      } else {

        conversationHistory =
          [];
      }


    } catch (error) {

      console.warn(
        '[AI Chat] Could not load conversation.',
        error
      );

      conversationHistory = [];
    }
  }


  // ============================================================
  // SAVE CONVERSATION
  // ============================================================

  function saveConversation() {

    try {

      /*
       * Keep browser storage reasonably small.
       *
       * The complete conversation should ultimately
       * be handled by n8n/AI memory.
       */

      var limitedHistory =
        conversationHistory.slice(
          -30
        );


      localStorage.setItem(
        STORAGE_KEYS.CONVERSATION,
        JSON.stringify(
          limitedHistory
        )
      );


    } catch (error) {

      console.warn(
        '[AI Chat] Could not save conversation.',
        error
      );
    }
  }


  // ============================================================
  // ADD TO LOCAL CONVERSATION
  // ============================================================

  function addToConversation(
    role,
    text
  ) {

    if (!text) {
      return;
    }


    conversationHistory.push({

      role: role,

      content: text,

      timestamp:
        new Date().toISOString()

    });


    saveConversation();
  }


  // ============================================================
  // BUILD PROFILE FOR N8N
  // ============================================================

  function buildProfilePayload() {

    return {

      userId: userId,

      name:
        userProfile.name || '',

      contact:
        userProfile.contact || '',

      email:
        userProfile.email || '',

      service:
        userProfile.service || '',

      requirement:
        userProfile.requirement || '',

      budget:
        userProfile.budget || '',

      timeline:
        userProfile.timeline || '',

      lastTopic:
        userProfile.lastTopic || '',

      lastSummary:
        userProfile.lastSummary || '',

      leadStatus:
        userProfile.leadStatus || ''

    };
  }


  // ============================================================
  // BUILD REQUEST
  // ============================================================

  function buildRequestPayload(
    message
  ) {

    return {

      /*
       * Identity
       */

      userId:
        userId,


      /*
       * Returning user
       */

      returningUser:
        Object.keys(
          userProfile
        ).length > 0,


      /*
       * Customer profile
       */

      profile:
        buildProfilePayload(),


      /*
       * Current message
       */

      message:
        message,


      /*
       * Conversation ID
       *
       * n8n can create its own conversation ID
       * if this is null.
       */

      conversationId:
        conversationId,


      /*
       * Browser conversation context
       *
       * This is useful for the first version.
       *
       * Later, n8n AI Memory can become the
       * primary conversation memory.
       */

      conversation:
        conversationHistory.slice(
          -20
        ),


      /*
       * Client information
       */

      client: {

        page:
          window.location.href,

        pageTitle:
          document.title,

        userAgent:
          navigator.userAgent,

        language:
          navigator.language || '',

        timezone:
          Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone || '',

        timestamp:
          new Date().toISOString()

      }

    };
  }


  // ============================================================
  // UPDATE PROFILE FROM N8N RESPONSE
  // ============================================================

  function updateProfileFromResponse(
    response
  ) {

    if (!response) {
      return;
    }


    /*
     * We expect n8n to eventually return:
     *
     * response.profile
     *
     * Example:
     *
     * {
     *   name: "Rahul",
     *   contact: "98xxxx",
     *   service: "Web Development"
     * }
     */


    if (
      response.profile &&
      typeof response.profile ===
        'object'
    ) {

      saveUserProfile(
        response.profile
      );
    }


    /*
     * Also support top-level fields.
     */

    var profileUpdate = {};


    if (response.name) {

      profileUpdate.name =
        response.name;
    }


    if (response.contact) {

      profileUpdate.contact =
        response.contact;
    }


    if (response.email) {

      profileUpdate.email =
        response.email;
    }


    if (response.service) {

      profileUpdate.service =
        response.service;
    }


    if (response.requirement) {

      profileUpdate.requirement =
        response.requirement;
    }


    if (response.budget) {

      profileUpdate.budget =
        response.budget;
    }


    if (response.timeline) {

      profileUpdate.timeline =
        response.timeline;
    }


    if (response.summary) {

      profileUpdate.lastSummary =
        response.summary;
    }


    if (response.leadStatus) {

      profileUpdate.leadStatus =
        response.leadStatus;
    }


    if (
      Object.keys(
        profileUpdate
      ).length > 0
    ) {

      saveUserProfile(
        profileUpdate
      );
    }


    /*
     * Conversation ID returned by n8n.
     */

    if (
      response.conversationId
    ) {

      conversationId =
        response.conversationId;


      root.setAttribute(
        'data-conversation-id',
        conversationId
      );
    }
  }


  // ============================================================
  // NORMALIZE N8N RESPONSE
  // ============================================================

  function extractReply(
    data
  ) {

    if (!data) {
      return '';
    }


    /*
     * Most preferred:
     *
     * {
     *   reply: "Hello Rahul"
     * }
     */

    if (
      typeof data.reply ===
      'string'
    ) {

      return data.reply;
    }


    /*
     * Alternative:
     *
     * {
     *   response: "Hello"
     * }
     */

    if (
      typeof data.response ===
      'string'
    ) {

      return data.response;
    }


    /*
     * Alternative:
     *
     * {
     *   message: "Hello"
     * }
     */

    if (
      typeof data.message ===
      'string'
    ) {

      return data.message;
    }


    /*
     * Some n8n workflows may return:
     *
     * {
     *   output: "Hello"
     * }
     */

    if (
      typeof data.output ===
      'string'
    ) {

      return data.output;
    }


    return '';
  }


  // ============================================================
  // SEND REQUEST TO N8N
  // ============================================================

  async function sendToN8N(
    message
  ) {

    /*
     * Don't accidentally send without configuration.
     */

    if (
      !N8N_WEBHOOK_URL ||
      N8N_WEBHOOK_URL ===
        'YOUR_N8N_WEBHOOK_URL_HERE'
    ) {

      throw new Error(
        'n8n Webhook URL is not configured.'
      );
    }


    var payload =
      buildRequestPayload(
        message
      );


    console.log(
      '[AI Chat] Sending request to n8n:',
      payload
    );


    var response =
      await fetch(
        N8N_WEBHOOK_URL,
        {

          method: 'POST',

          headers: {

            'Content-Type':
              'application/json',

            'Accept':
              'application/json'

          },

          body:
            JSON.stringify(
              payload
            )

        }
      );


    /*
     * HTTP error
     */

    if (!response.ok) {

      throw new Error(
        'n8n returned HTTP ' +
        response.status
      );
    }


    /*
     * Parse JSON
     */

    var data =
      await response.json();


    console.log(
      '[AI Chat] n8n response:',
      data
    );


    return data;
  }


  // ============================================================
  // SEND MESSAGE
  // ============================================================

  async function sendMessage(
    text
  ) {

    if (
      !text ||
      isSending ||
      isEnding
    ) {

      return;
    }


    /*
     * Display user message immediately.
     */

    addMessage(
      text,
      'user'
    );


    /*
     * Save local conversation.
     */

    addToConversation(
      'user',
      text
    );


    /*
     * Clear input.
     */

    inputEl.value = '';


    /*
     * Show typing.
     */

    addTypingIndicator();


    /*
     * Lock send button.
     */

    isSending = true;


    if (sendBtn) {

      sendBtn.disabled =
        true;
    }


    setStatus(
      'AI is thinking...'
    );


    try {

      /*
       * Send to n8n.
       */

      var data =
        await sendToN8N(
          text
        );


      /*
       * Remove typing.
       */

      removeTypingIndicator();


      /*
       * Update customer profile
       * from n8n.
       */

      updateProfileFromResponse(
        data
      );


      /*
       * Get AI response.
       */

      var reply =
        extractReply(
          data
        );


      if (!reply) {

        throw new Error(
          'n8n returned an empty AI response.'
        );
      }


      /*
       * Display AI response.
       */

      addMessage(
        reply,
        'agent'
      );


      /*
       * Save AI response locally.
       */

      addToConversation(
        'agent',
        reply
      );


      /*
       * Clear status.
       */

      setStatus('');


    } catch (error) {

      console.error(
        '[AI Chat] n8n request failed:',
        error
      );


      removeTypingIndicator();


      addMessage(
        'Sorry, I am having trouble connecting right now. Please try again in a moment.',
        'agent'
      );


      setStatus(
        'Connection problem. Please try again.',
        true
      );


    } finally {

      isSending = false;


      if (sendBtn) {

        sendBtn.disabled =
          false;
      }


      inputEl.focus();
    }
  }


  // ============================================================
  // END CONVERSATION
  // ============================================================

  function endConversation() {

    if (isEnding) {
      return;
    }


    isEnding = true;


    removeTypingIndicator();


    if (sendBtn) {

      sendBtn.disabled =
        true;
    }


    setEndButtonVisible(
      false
    );


    /*
     * We don't delete localStorage here.
     *
     * This is intentional.
     *
     * The browser should remember the user
     * for their next visit.
     */


    setStatus(
      'Conversation ended.'
    );


    /*
     * Optional:
     *
     * In the future we can send an explicit
     * "conversation_end" event to n8n.
     *
     * That can trigger final summary processing.
     */


    console.log(
      '[AI Chat] Conversation ended.',
      {
        userId:
          userId,

        conversationId:
          conversationId
      }
    );
  }


  // ============================================================
  // CLEAR LOCAL CONVERSATION
  // ============================================================

  /*
   * This function is intentionally NOT connected
   * to the UI yet.
   *
   * Later we can add a "New Chat" button.
   */

  function clearLocalConversation() {

    conversationHistory =
      [];

    try {

      localStorage.removeItem(
        STORAGE_KEYS.CONVERSATION
      );

    } catch (error) {

      console.warn(
        '[AI Chat] Could not clear conversation.',
        error
      );
    }
  }


  // ============================================================
  // FORM SUBMIT
  // ============================================================

  formEl.addEventListener(
    'submit',
    function (event) {

      event.preventDefault();


      if (
        isEnding ||
        isSending
      ) {

        return;
      }


      var text =
        inputEl.value.trim();


      if (!text) {
        return;
      }


      sendMessage(
        text
      );
    }
  );


  // ============================================================
  // ENTER KEY
  // ============================================================

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


  // ============================================================
  // INITIALIZE
  // ============================================================

  function initialize() {

    console.log(
      '[AI Chat] Initializing n8n chatbot...'
    );


    /*
     * User identity
     */

    initializeUserId();


    /*
     * Load profile
     */

    loadUserProfile();


    /*
     * Load local conversation
     */

    loadConversation();


    /*
     * End button
     */

    createEndButton();


    setEndButtonVisible(
      true
    );


    /*
     * Store user ID on root element.
     */

    root.setAttribute(
      'data-user-id',
      userId
    );


    /*
     * Returning user information
     */

    var returningUser =
      Object.keys(
        userProfile
      ).length > 0;


    console.log(
      '[AI Chat] User initialized:',
      {
        userId:
          userId,

        returningUser:
          returningUser,

        profile:
          userProfile
      }
    );


    /*
     * We DO NOT connect to anything here.
     *
     * Unlike ElevenLabs WebSocket,
     * n8n is request-based.
     *
     * The connection/request happens
     * only when the user sends a message.
     */

    setStatus('');


    /*
     * Optional welcome context.
     */

    if (returningUser) {

      console.log(
        '[AI Chat] Returning user detected.'
      );
    }


    inputEl.focus();
  }


  // ============================================================
  // START
  // ============================================================

  initialize();

})();