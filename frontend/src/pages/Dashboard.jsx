import { useEffect, useState } from "react";
import socketService from "../services/socketService";

export default function Dashboard() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    socketService.connect();
    socketService.onQueueUpdate((data) => setQueue(data));

    return () => socketService.removeListener("queue-update");
  }, []);

  return (
    <div>
      <h1>Live Queue</h1>

      {queue.map((q, index) => (
        <div key={index}>
          Token: {q.tokenNumber}
        </div>
      ))}
    </div>
  );
}
