import { motion } from "framer-motion";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  className = "",
}: TabsProps) {
  return (
    <div className={`inline-flex rounded-xl border border-white/[0.06] bg-bg-card/40 p-1 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${
            activeTab === tab.id
              ? "bg-accent-blue/20 text-accent-blue"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          {tab.label}
          {activeTab === tab.id && (
            <motion.span
              layoutId="active-tab"
              className="absolute inset-0 rounded-lg bg-accent-blue/10"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}