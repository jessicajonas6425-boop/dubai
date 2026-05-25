import { MessageCircle } from 'lucide-react';

export default function WhatsAppFloatingIcon({ phoneNumber }: { phoneNumber: string }) {
  return (
    <a
      href={phoneNumber}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-6 right-6 z-[999] bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"
      aria-label="WhatsApp"
    >
      <MessageCircle size={28} />
    </a>
  );
}
