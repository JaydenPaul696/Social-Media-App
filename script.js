//JS by Jayden Paul.
//Contact: +2348081356017


// Hamburger Toggle Logic
const hamburger = document.getElementById("hamburger");
const sidebar = document.getElementById("sidebar");

hamburger.addEventListener("click", () => {
  sidebar.classList.remove("hidden");
  sidebar.classList.add("show");
});

function closeMenu() {
  sidebar.classList.remove("show");
  sidebar.classList.add("hidden");
}

//Optional: Escape key closes menu too
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMenu();
});

// Load dark mode preference on page load
window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("dark-mode") === "true") {
    document.body.classList.add("dark-mode");
  }
});
// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAysH279Sgkr7TZxLBz7FmG4imf4akZlBI",
  authDomain: "encrypto-chat-e8f45.firebaseapp.com",
  databaseURL: "https://encrypto-chat-e8f45-default-rtdb.firebaseio.com",
  projectId: "encrypto-chat-e8f45",
  storageBucket: "encrypto-chat-e8f45.firebasestorage.app",
  messagingSenderId: "956626393699",
  appId: "1:956626393699:web:5d56ddafe55f1499577656",
  measurementId: "G-N3GZQZLV0K"
};

// Init Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const loader = document.getElementById("loader");
const authContainer = document.getElementById("auth-container");
const chatContainer = document.getElementById("chat-container");
const toggleModeBtn = document.getElementById("toggleMode");
let currentUser = null;
let activeChatId = null;

// Dark mode toggle
toggleModeBtn.onclick = () => {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("dark-mode", document.body.classList.contains("dark-mode"));
};
if (localStorage.getItem("dark-mode") === "true") {
  document.body.classList.add("dark-mode");
}

// Loader control
function showLoader() {
  loader.classList.remove("hide");
}
function hideLoader() {
  loader.classList.add("hide");
}

// Avatar Color Generator
function getAvatarColor(name) {
  const colors = ["#FF007F", "#00FFFF", "#FFD700", "#7CFC00", "#FF4500", "#BA55D3"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase();
}

// Register User
function register() {
  const name = document.getElementById("displayName").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!name || !email || !password) return alert("Fill all fields!");

  showLoader();
  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      const code = name + "#" + Math.floor(1000 + Math.random() * 9000);
      return db.collection("users").doc(cred.user.uid).set({
        displayName: name,
        chatCode: code
      }).then(() => {
        alert("Registered! Your chat-code is: " + code);
        hideLoader();
      });
    })
    .catch(err => {
      alert("Registration error: " + err.message);
      hideLoader();
    });
}

// Login User
function login() {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  if (!email || !password) return alert("Fill all fields!");

  showLoader();
  auth.signInWithEmailAndPassword(email, password)
    .then(cred => {
      currentUser = cred.user.uid;
      return db.collection("users").doc(currentUser).get();
    })
    .then(doc => {
      authContainer.style.display = "none";
      chatContainer.style.display = "block";
      document.getElementById("welcomeMsg").innerText =
        `Welcome, ${doc.data().displayName} (${doc.data().chatCode})`;
      hideLoader();
    })
    .catch(err => {
      alert("Login error: " + err.message);
      hideLoader();
    });
}

// Start Chat
function startChat() {
  const code = document.getElementById("friendCode").value.trim();
  if (!code) return alert("Enter a chat-code!");

  showLoader();
  db.collection("users").where("chatCode", "==", code).get()
    .then(snapshot => {
      if (!snapshot.empty) {
        const friendId = snapshot.docs[0].id;
        activeChatId = [currentUser, friendId].sort().join("_");
        listenToMessages();
      } else {
        alert("No user found with that chat-code.");
      }
      hideLoader();
    });
}

// Send Message
function sendMessage() {
  const msg = document.getElementById("messageInput").value.trim();
  if (!msg || !activeChatId) return;
  db.collection("chats").doc(activeChatId).collection("messages").add({
    sender: currentUser,
    text: msg,
    timestamp: new Date()
  });
  document.getElementById("messageInput").value = "";
}

// Listen to Messages
function listenToMessages() {
  const chatBox = document.getElementById("chatBox");
  chatBox.innerHTML = "";

  db.collection("chats").doc(activeChatId).collection("messages")
    .orderBy("timestamp")
    .onSnapshot(snapshot => {
      chatBox.innerHTML = "";
      snapshot.forEach(async doc => {
        const msg = doc.data();
        const isYou = msg.sender === currentUser;
        const userDoc = await db.collection("users").doc(msg.sender).get();
        const name = userDoc.data().displayName;
        const initials = getInitials(name);
        const color = getAvatarColor(name);

        const bubble = document.createElement("div");
        bubble.className = "message " + (isYou ? "you" : "them");
        bubble.innerHTML = `
          <div class="avatar" style="background-color:${color}">${initials}</div>
          <span style="background-color: brown; border-radius: 20px;">${msg.text}</span>
        `;
        chatBox.appendChild(bubble);
      });
      chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// Load contacts from Firestore
function loadContacts() {
  const list = document.getElementById("contactsList");
  list.innerHTML = "<li>Loading...</li>";

  db.collection("users").get().then(snapshot => {
    list.innerHTML = "";
    snapshot.forEach(doc => {
      const user = doc.data();
      const userId = doc.id;
      if (userId === currentUser) return;

      const li = document.createElement("li");
      const color = getAvatarColor(user.displayName);
      const initials = getInitials(user.displayName);

      li.innerHTML = `
        <div class="avatar" style="background-color:${color}">${initials}</div>
        <div>
          <div><strong>${user.displayName}</strong></div>
          <div style="font-size: 0.8em; color: #aaa;">${user.chatCode}</div>
        </div>
      `;

      li.onclick = () => {
        activeChatId = [currentUser, userId].sort().join("_");
        closeMenu();
        listenToMessages();
      };

      list.appendChild(li);
    });
  });
// Set user as online
db.collection("users").doc(currentUser).update({ online: true });
window.addEventListener("beforeunload", () => {
  db.collection("users").doc(currentUser).update({ online: false });
});
}
function searchUsers() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const results = document.getElementById("searchResults");
  results.innerHTML = "";

  if (!query) return;

  db.collection("users").get().then(snapshot => {
    snapshot.forEach(doc => {
      const user = doc.data();
      const userId = doc.id;

      if (userId === currentUser) return;
      const nameMatch = user.displayName.toLowerCase().includes(query);
      const codeMatch = user.chatCode.toLowerCase().includes(query);

      if (nameMatch || codeMatch) {
        const li = document.createElement("li");
        const color = getAvatarColor(user.displayName);
        const initials = getInitials(user.displayName);
        const statusDot = user.online ? "🟢" : "⭕";

        li.innerHTML = `
          <div class="avatar" style="background-color:${color}">${initials}</div>
          <div>
            <div><strong>${user.displayName}</strong> ${statusDot}</div>
            <div style="font-size: 0.8em; color: #aaa;">${user.chatCode}</div>
          </div>
        `;

        li.onclick = () => {
          activeChatId = [currentUser, userId].sort().join("_");
          closeMenu();
          listenToMessages();
        };

        results.appendChild(li);
      }
    });
  });
}