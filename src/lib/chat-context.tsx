"use client";
import { createContext, useContext } from "react";

type ChatActions = { sendMessage: (text: string) => void };

const ChatActionsContext = createContext<ChatActions>({ sendMessage: () => {} });

export const ChatActionsProvider = ChatActionsContext.Provider;
export const useChatActions = () => useContext(ChatActionsContext);
