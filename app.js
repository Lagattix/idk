import { db } from './firebase.js';
import { ref, push, onValue } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

let username = '';

const loginDiv = document.getElementById('login');
const chatDiv = document.getElementById('chat');
const enterBtn = document.getElementById('enterChat');
const messagesDiv = document.getElementById('messages');
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');

enterBtn.addEventListener('click', () => {
  username = document.getElementById('username').value.trim();
  if(username){
    loginDiv.style.display = 'none';
    chatDiv.style.display = 'block';
  }
});

// Invia messaggio
sendBtn.addEventListener('click', () => {
  const msg = messageInput.value.trim();
  if(msg){
    push(ref(db, 'messages'), {
      user: username,
      text: msg,
      timestamp: Date.now()
    });
    messageInput.value = '';
  }
});

// Ricevi messaggi in tempo reale
onValue(ref(db, 'messages'), (snapshot) => {
  messagesDiv.innerHTML = '';
  snapshot.forEach((child) => {
    const data = child.val();
    const msgDiv = document.createElement('div');
    msgDiv.textContent = `${data.user}: ${data.text}`;
    messagesDiv.appendChild(msgDiv);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
