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

  useEffect(() => {
    getUser();
    getPlaces();
    getEvents();
	requestNotificationPermission();

    const channel = supabase
      .channel("events-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "events",
        },
        () => {
          getEvents();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_participants",
        },
        () => {
          getEvents();
        }
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
		  vapidKey: "BJ1BUtXdxym6uwJYwRE0H0_A1b5Ch256mXARe9sjASHT8X905ipwNgWxX79Rq1lbYYhKK5fgRETFbq3H-JzqDXQ",
		});

      console.log("FCM TOKEN:", token);

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
      .select(`
        *,
        places(*),
        event_participants(*)
      `)
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
    });

    if (error) {
      alert(error.message);
      return;
    }

    setEventTitle("");
    setEventDescription("");
    setEventTime("");
    setSelectedPlace("");

    getEvents();
    setTab("home");
  };

  const joinEvent = async (eventId: string) => {
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

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    location.reload();
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-black text-white">
        <button
          onClick={loginWithGoogle}
          className="bg-white text-black px-6 py-3 rounded-xl font-semibold"
        >
          Login with Google
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-24">
      <div className="p-5 border-b border-zinc-800">
        <h1 className="text-2xl font-bold">Kuy BL</h1>

        <p className="text-zinc-400 text-sm mt-1">
          Billiard Event Scheduler
        </p>
      </div>

      {tab === "home" && (
        <div className="p-5">
          <h2 className="text-xl font-bold mb-4">Future Events</h2>
		  <button
		  onClick={async () => {
			const { data } = await supabase
			  .from("notification_tokens")
			  .select("token");

			const tokens = data?.map((x) => x.token) || [];

			await fetch("/api/send-notification", {
			  method: "POST",
			  headers: {
				"Content-Type": "application/json",
			  },
			  body: JSON.stringify({
				tokens,
				title: "Kuy BL",
				message: "Push notification test",
			  }),
			});
		  }}
		  className="bg-blue-600 px-4 py-2 rounded-xl"
		>
		  Test Notification
		</button>

          <div className="flex flex-col gap-3">
            {events.map((event) => {
              const joined =
                event.event_participants?.some(
                  (p: any) => p.user_id === user.id
                ) || false;

              return (
                <div
                  key={event.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
                >
                  <p className="font-semibold">{event.title}</p>

                  <p className="text-sm text-zinc-400 mt-1">
                    {new Date(event.event_time).toLocaleString()}
                  </p>

                  <p className="mt-2">{event.places?.title}</p>

                  <p className="text-sm mt-3">
                    {event.event_participants?.length || 0} players joined
                  </p>

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
                        className="bg-red-600 px-4 py-2 rounded-xl text-sm font-semibold"
                      >
                        un-join
                      </button>
                    ) : (
                      <button
                        onClick={() => joinEvent(event.id)}
                        className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold"
                      >
                        Join
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
            <input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder="Event title"
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
            />

            <textarea
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              placeholder="Short description"
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
            />

            <input
              type="datetime-local"
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
            />

            <select
              value={selectedPlace}
              onChange={(e) => setSelectedPlace(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
            >
              <option value="">Select Place</option>

              {places.map((place) => (
                <option key={place.id} value={place.id}>
                  {place.title}
                </option>
              ))}
            </select>

            <button
              onClick={addEvent}
              className="bg-white text-black rounded-xl py-3 font-semibold"
            >
              Create Event
            </button>
          </div>
        </div>
      )}

      {tab === "places" && (
        <div className="p-5">
          <h2 className="text-xl font-bold mb-4">Add Place</h2>

          <div className="flex flex-col gap-3 mb-6">
            <input
              value={placeTitle}
              onChange={(e) => setPlaceTitle(e.target.value)}
              placeholder="Place name"
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
            />

            <input
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              placeholder="Google Maps link"
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 outline-none"
            />

            <button
              onClick={addPlace}
              className="bg-white text-black rounded-xl py-3 font-semibold"
            >
              Save Place
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {places.map((place) => (
              <div
                key={place.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4"
              >
                <p className="font-semibold">{place.title}</p>

                <a
                  href={place.maps_link}
                  target="_blank"
                  className="text-blue-400 text-sm mt-2 block"
                >
                  Open Maps
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "profile" && (
        <div className="p-5">
          <div className="flex flex-col items-center">
            <img
              src={user.user_metadata.avatar_url}
              alt="avatar"
              className="w-24 h-24 rounded-full"
            />

            <h2 className="text-xl font-bold mt-4">
              {user.user_metadata.full_name}
            </h2>

            <p className="text-zinc-400">{user.email}</p>

            <button
              onClick={logout}
              className="bg-white text-black rounded-xl py-3 px-6 font-semibold mt-6"
            >
              Logout
            </button>
          </div>
        </div>
      )}

      <BottomNav setTab={setTab} />
    </main>
  );
}