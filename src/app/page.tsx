"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { getFirebaseMessaging } from "../lib/firebase";
import { getToken } from "firebase/messaging";
import BottomNav from "../components/BottomNav";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState("home");

  const [places, setPlaces] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const [placeTitle, setPlaceTitle] = useState("");
  const [mapsLink, setMapsLink] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [selectedPlace, setSelectedPlace] = useState("");

  const [limitPlayers, setLimitPlayers] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState("");

  // ✅ NEW FILTER STATE (updated logic)
  const [filterPlace, setFilterPlace] = useState("");
  const [filterDateCluster, setFilterDateCluster] = useState("");

  useEffect(() => {
    getUser();
    getPlaces();
    getEvents();
    requestNotificationPermission();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }

    const channel = supabase
      .channel("events-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => getEvents()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_participants" },
        () => getEvents()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        const token = await getToken(messaging, {
          vapidKey:
            "BJ1BUtXdxym6uwJYwRE0H0_A1b5Ch256mXARe9sjASHT8X905ipwNgWxX79Rq1lbYYhKK5fgRETFbq3H-JzqDXQ",
        });

        await supabase.from("notification_tokens").upsert({
          user_id: user?.id,
          token,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getPlaces = async () => {
    const { data } = await supabase
      .from("places")
      .select("*")
      .order("created_at", { ascending: false });

    setPlaces(data || []);
  };

  const getEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select(`*, places(*), event_participants(*)`)
      .order("event_time", { ascending: true });

    setEvents(data || []);
  };

  const addPlace = async () => {
    if (!placeTitle || !mapsLink) return;

    const { error } = await supabase.from("places").insert({
      title: placeTitle,
      maps_link: mapsLink,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setPlaceTitle("");
    setMapsLink("");
    getPlaces();
  };

  const deletePlace = async (id: string) => {
    if (!confirm("Delete this place?")) return;
    await supabase.from("places").delete().eq("id", id);
    getPlaces();
  };

  const addEvent = async () => {
    if (!eventTitle || !eventTime || !selectedPlace) {
      alert("Please complete all fields");
      return;
    }

    const { error } = await supabase.from("events").insert({
      title: eventTitle,
      description: eventDescription,
      event_time: new Date(eventTime).toISOString(),
      place_id: selectedPlace,
      created_by: user.id,
      max_players: limitPlayers ? Number(maxPlayers) : null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setEventTitle("");
    setEventDescription("");
    setEventTime("");
    setSelectedPlace("");
    setLimitPlayers(false);
    setMaxPlayers("");

    getEvents();
    setTab("home");
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    await supabase.from("events").delete().eq("id", id);
    getEvents();
  };

  const joinEvent = async (eventId: string) => {
    const event = events.find((e) => e.id === eventId);
    const participants = event?.event_participants || [];

    if (event?.max_players && participants.length >= event.max_players) {
      alert("Event is full");
      return;
    }

    const { error } = await supabase
      .from("event_participants")
      .insert({
        event_id: eventId,
        user_id: user.id,
      });

    if (error) {
      alert("Already joined");
      return;
    }

    getEvents();
  };

  const unjoinEvent = async (eventId: string) => {
    await supabase
      .from("event_participants")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    getEvents();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

	if (!user) {
	  return (
		<main className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
		  
		  <img
			src="/icon-192.png"
			className="w-24 h-24 rounded-full mb-4"
		  />

		  <h1 className="text-2xl font-bold">Kuy BL</h1>

		  <p className="text-zinc-400 text-sm mt-1 mb-6">
			gas BL lah, masa engga!
		  </p>

		  <button
			onClick={() =>
			  supabase.auth.signInWithOAuth({ provider: "google" })
			}
			className="bg-white text-black px-6 py-3 rounded-xl font-semibold cursor-pointer"
		  >
			Login with Google
		  </button>
		</main>
	  );
	}

  // ✅ FILTER LOGIC (NEW)
  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.event_time);

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isToday =
      eventDate.toDateString() === today.toDateString();

    const isTomorrow =
      eventDate.toDateString() === tomorrow.toDateString();

    const isThisWeekPlus =
      !isToday &&
      !isTomorrow &&
      eventDate > tomorrow;

    const matchDateCluster =
      filterDateCluster === ""
        ? true
        : filterDateCluster === "today"
        ? isToday
        : filterDateCluster === "tomorrow"
        ? isTomorrow
        : isThisWeekPlus;

    const matchPlace = filterPlace
      ? event.place_id === filterPlace
      : true;

    return matchDateCluster && matchPlace;
  });

  return (
    <main className="min-h-screen bg-black text-white pb-24">
      <div className="p-5 border-b border-zinc-800">
        <h1 className="text-2xl font-bold cursor-pointer">Kuy BL</h1>
        <p className="text-zinc-400 text-sm mt-1">
          gas BL lah, masa engga
        </p>
      </div>

      {tab === "home" && (
        <div className="p-5">
          <h2 className="text-xl font-bold mb-4">Future Events</h2>

          {/* FILTER UI */}
          <div className="flex gap-2 mb-4">
            <select
              value={filterDateCluster}
              onChange={(e) => setFilterDateCluster(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">All Dates</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="week">This Week+</option>
            </select>

            <select
              value={filterPlace}
              onChange={(e) => setFilterPlace(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">All Places</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3">
            {filteredEvents.map((event) => {
              const participants = event.event_participants || [];
              const joined =
                participants.some((p: any) => p.user_id === user.id);

              const eventDate = new Date(event.event_time);
              const today = new Date();
              const tomorrow = new Date();
              tomorrow.setDate(today.getDate() + 1);

              const isToday =
                eventDate.toDateString() === today.toDateString();
              const isTomorrow =
                eventDate.toDateString() === tomorrow.toDateString();

              return (
                <div
                  key={event.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
                >
                  <div className="flex justify-between items-center">
                    <p className="font-semibold">{event.title}</p>

                    {isToday && (
                      <span className="text-xs bg-green-600 px-2 py-1 rounded">
                        Today
                      </span>
                    )}

                    {!isToday && isTomorrow && (
                      <span className="text-xs bg-blue-600 px-2 py-1 rounded">
                        Tomorrow
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-zinc-400 mt-1">
                    {new Date(event.event_time).toLocaleString()}
                  </p>

                  <p className="mt-2">{event.places?.title}</p>

                  <div className="flex items-center gap-2 mt-3">
                    <p className="text-sm">
                      {participants.length}
                      {event.max_players
                        ? ` / ${event.max_players}`
                        : ""}{" "}
                      players joined
                    </p>

                    <div className="flex ml-2">
                      {participants.slice(0, 4).map((p: any, i: number) => (
                        <img
                          key={i}
                          src={
                            p.user_id === user.id
                              ? user.user_metadata?.avatar_url
                              : `https://api.dicebear.com/7.x/initials/svg?seed=${p.user_id}`
                          }
                          className="w-6 h-6 rounded-full border-2 border-black -ml-2"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <a
                      href={event.places?.maps_link}
                      target="_blank"
                      className="bg-zinc-800 px-4 py-2 rounded-xl text-sm"
                    >
                      Maps
                    </a>

                    {joined ? (
                      <button
                        onClick={() => unjoinEvent(event.id)}
                        className="bg-red-600 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                      >
                        Batal Join
                      </button>
                    ) : (
                      <button
                        onClick={() => joinEvent(event.id)}
                        className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                      >
                        Kuy Join
                      </button>
                    )}

                    {event.created_by === user.id && (
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="text-red-400 text-sm cursor-pointer"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "create" && (
        <div className="p-5">
          <h2 className="text-xl font-bold mb-4">Create Event</h2>

          <div className="flex flex-col gap-3">
            <input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Event title" className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none" />
            <textarea value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} placeholder="Short description" className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none" />
            <input type="datetime-local" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none" />
            <select value={selectedPlace} onChange={(e) => setSelectedPlace(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none">
              <option value="">Select Place</option>
              {places.map((place) => (
                <option key={place.id} value={place.id}>{place.title}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <input type="checkbox" checked={limitPlayers} onChange={(e) => setLimitPlayers(e.target.checked)} />
              <span>Limit players</span>
            </div>

            {limitPlayers && (
              <input type="number" placeholder="Max players" value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none" />
            )}

            <button onClick={addEvent} className="bg-white text-black rounded-xl py-3 font-semibold cursor-pointer">
              Create Event
            </button>
          </div>
        </div>
      )}

      {tab === "places" && (
        <div className="p-5">
          <h2 className="text-xl font-bold mb-4">Add Place</h2>

          <div className="flex flex-col gap-3 mb-6">
            <input value={placeTitle} onChange={(e) => setPlaceTitle(e.target.value)} placeholder="Place name" className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none" />
            <input value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} placeholder="Google Maps link" className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none" />

            <button onClick={addPlace} className="bg-white text-black rounded-xl py-3 font-semibold cursor-pointer">
              Save Place
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {places.map((place) => (
              <div key={place.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{place.title}</p>
                  <a href={place.maps_link} target="_blank" className="text-blue-400 text-sm mt-2 block">
                    Open Maps
                  </a>
                </div>

                <button onClick={() => deletePlace(place.id)} className="text-red-400 text-sm cursor-pointer">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "profile" && (
        <div className="p-5">
          <div className="flex flex-col items-center">
            <img src={user.user_metadata.avatar_url} className="w-24 h-24 rounded-full" />
            <h2 className="text-xl font-bold mt-4">{user.user_metadata.full_name}</h2>
            <p className="text-zinc-400">{user.email}</p>

            <button onClick={logout} className="bg-white text-black rounded-xl py-3 px-6 font-semibold mt-6 cursor-pointer">
              Logout
            </button>
          </div>
        </div>
      )}

      <BottomNav setTab={setTab} />
    </main>
  );
}