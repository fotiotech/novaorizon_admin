// pages/checkout.jsx
import { useUser } from "@/app/context/UserContext"; // Assuming you have a custom hook to get user info
import ChatWidget from "../_component/ChatWidget";
import { useState } from "react";
import ChatRoomList from "../_component/ChatRoomList"; // Assuming you have a component to list chat rooms
export default function Checkout() {
  const { user } = useUser();
  const [activeRoom, setActiveRoom] = useState(null);

  return (
    <div className="flex h-screen">
      <ChatRoomList onSelectRoom={setActiveRoom} />
      <div className="flex-1 relative">
        {activeRoom ? (
          <ChatWidget user={user} roomId={activeRoom} />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            Sélectionnez une conversation
          </div>
        )}
      </div>
    </div>
  );
}

// If using getServerSideProps:
// export async function getServerSideProps(ctx) {
//   const user = await getUserFromSession(ctx.req);
//   return { props: { user } };
// }
