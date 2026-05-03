type Props = {
  setTab: (tab: string) => void;
};

export default function BottomNav({ setTab }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 h-16 flex items-center justify-around text-white">
      <button onClick={() => setTab("home")}>Home</button>

      <button onClick={() => setTab("create")}>Create</button>

      <button onClick={() => setTab("places")}>Places</button>

      <button onClick={() => setTab("profile")}>Profile</button>
    </nav>
  );
}