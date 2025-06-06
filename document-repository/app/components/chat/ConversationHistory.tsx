"use client";

import { useState, useEffect } from "react";
import { useConversationStore } from "@/app/store/conversationStore";
import { Conversation } from "@/app/lib/memory/conversationMemory";

interface ConversationHistoryProps {
  onClose?: () => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  onClose,
}) => {
  const {
    conversations,
    currentConversationId,
    setCurrentConversation,
    deleteConversation,
    fetchConversations,
    createConversation,
  } = useConversationStore();

  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [title, setTitle] = useState("");

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleTitleEdit = (conversation: Conversation) => {
    setEditingTitle(conversation.id);
    setTitle(conversation.title);
  };

  const handleTitleSave = async (id: string) => {
    if (title.trim()) {
      await useConversationStore
        .getState()
        .updateConversationTitle(id, title.trim());
    }
    setEditingTitle(null);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      handleTitleSave(id);
    } else if (e.key === "Escape") {
      setEditingTitle(null);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  const handleNewChat = async () => {
    await createConversation();
    if (onClose) onClose();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center px-4 py-3 border-b">
        <h2 className="text-lg font-medium">Conversations</h2>
        <button
          onClick={handleNewChat}
          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
        >
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="text-center p-4 text-gray-500">
            No conversations yet
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conversation, index) => (
              <li key={`${conversation.id}-${index}`}>
                <div
                  className={`flex items-center justify-between p-2 rounded-md ${
                    conversation.id === currentConversationId
                      ? "bg-blue-50 border-blue-200 border"
                      : "hover:bg-gray-100"
                  }`}
                >
                  <div
                    className="flex-1 cursor-pointer overflow-hidden"
                    onClick={() => {
                      setCurrentConversation(conversation.id);
                      if (onClose) onClose();
                    }}
                  >
                    {editingTitle === conversation.id ? (
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={() => handleTitleSave(conversation.id)}
                        onKeyDown={(e) =>
                          handleTitleKeyDown(e, conversation.id)
                        }
                        className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : (
                      <div className="flex flex-col">
                        <span className="font-medium truncate">
                          {conversation.title}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(conversation.updatedAt)} ·{" "}
                          {conversation.messages?.length || 0} messages
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleTitleEdit(conversation)}
                      className="p-1 text-gray-500 hover:text-gray-700 rounded"
                      title="Edit title"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this conversation?")) {
                          deleteConversation(conversation.id);
                        }
                      }}
                      className="p-1 text-gray-500 hover:text-red-600 rounded"
                      title="Delete conversation"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ConversationHistory;
