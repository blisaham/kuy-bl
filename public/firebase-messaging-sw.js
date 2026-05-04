importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCod6Tj0RRHezf-fW7Sj0IyKCV6unYeX9w",
  authDomain: "kuy-bl-c4e17.firebaseapp.com",
  projectId: "kuy-bl-c4e17",
  storageBucket: "kuy-bl-c4e17.firebasestorage.app",
  messagingSenderId: "192103480532",
  appId: "1:192103480532:web:d388079075f29b8044cf41",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon-192.png",
  });
});
