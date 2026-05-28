import { MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

export function ChatPanel() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Welcome to Digital Evidence", sender: "system" },
  ]);
  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (inputValue.trim()) {
      setMessages([
        ...messages,
        { id: Date.now(), text: inputValue, sender: "user" },
      ]);
      setInputValue("");
    }
  };

  return (
    <Card className="glass-panel relative border-none shadow-2xl rounded-2xl h-[400px] overflow-hidden">
      <CardHeader className="border-b border-white/20 dark:border-white/5 pb-4 px-6 pt-5">
        <CardTitle className="flex items-center gap-2 text-blue-950 dark:text-blue-200 font-bold">
          <MessageCircle className="w-5 h-5 text-blue-900 dark:text-blue-400" />
          Evidence Chat Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col h-[calc(100%-70px)] p-6 justify-between">
        <ScrollArea className="flex-1 pr-2 mb-4 h-[240px]">
          <div className="space-y-4 pr-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3.5 rounded-2xl text-sm leading-relaxed max-w-[85%] shadow-sm ${
                  msg.sender === "user"
                    ? "bg-gradient-to-tr from-[#030213] to-blue-900 dark:from-blue-700 dark:to-blue-500 text-white ml-auto rounded-tr-none shadow-blue-950/10"
                    : "backdrop-blur-md bg-white/60 border border-white/60 dark:bg-white/5 dark:border-white/5 text-gray-800 dark:text-gray-200 mr-auto rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex gap-2">
          <Input
            placeholder="Ask anything about the evidence..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="glass-input h-11 px-4 rounded-xl text-sm border-none"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            className="w-11 h-11 cursor-pointer rounded-xl bg-gradient-to-tr from-[#030213] to-blue-900 dark:from-blue-700 dark:to-blue-500 text-white hover:scale-105 active:scale-95 transition-all shadow-md shadow-blue-500/10"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
