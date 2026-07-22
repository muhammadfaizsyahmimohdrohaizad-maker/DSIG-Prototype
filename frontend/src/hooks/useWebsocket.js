import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (accountId) => {
  const [messages, setMessages] = useState([]);
  const [escalation, setEscalation] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!accountId) return;

    // Establish WebSocket connection to backend gateway
    const wsUrl = `ws://${window.location.host}/api/v1/ws/chat/${accountId}`;
    socketRef.current = new WebSocket(wsUrl);

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMessages((prev) => [...prev, data]);
      
      // Trigger escalation state if high churn threat or negative sentiment is flagged
      if (data.should_escalate) {
        setEscalation(data);
      }
    };

    return () => {
      socketRef.current?.close();
    };
  }, [accountId]);

  const sendMessage = (text) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ text }));
    }
  };

  return { messages, escalation, sendMessage };
};