import { Navigate } from "react-router-dom";

// The Memory Book is now unified with the main Memories feature.
// This route exists for backward compatibility and forwards to /memories.
export default function SeasonsMemoryBook() {
  return <Navigate to="/memories" replace />;
}