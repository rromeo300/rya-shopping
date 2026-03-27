import ChatInterface from '@/components/ChatInterface';

export const metadata = {
  title: 'Chat - Asistente de Propiedades',
};

export default function ChatPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      <ChatInterface />
    </div>
  );
}
