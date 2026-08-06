import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

interface AccordionProps {
  items: AccordionItem[];
  defaultOpen?: string;
}

export default function Accordion({
  items,
  defaultOpen,
}: AccordionProps) {
  const [openId, setOpenId] = useState(defaultOpen || items[0]?.id);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-white/[0.06] bg-bg-card/40 overflow-hidden"
        >
          <button
            onClick={() => setOpenId(openId === item.id ? "" : item.id)}
            className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-gray-200 transition-colors hover:text-white"
          >
            {item.title}
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${
                openId === item.id ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <AnimatePresence>
            {openId === item.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="px-5 pb-4 text-sm text-gray-400">
                  {item.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}