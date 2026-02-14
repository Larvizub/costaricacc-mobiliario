
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref, get, set } from "firebase/database";

const AuthContext = createContext();

const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 horas en milisegundos
const LAST_ACTIVITY_KEY = "lastActivity";
const LAST_ACTIVITY_USER_KEY = "lastActivityUser";

export function useAuth() {
  return useContext(AuthContext);
}


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { type: 'firebase'|'microsoft', ...user }
  const [userData, setUserData] = useState(null); // datos extendidos
  const [loading, setLoading] = useState(true);

  // Gestión de inactividad
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      localStorage.setItem(LAST_ACTIVITY_USER_KEY, user.uid || user.email || "");
    };

    const checkInactivity = () => {
      const trackedUser = localStorage.getItem(LAST_ACTIVITY_USER_KEY);
      const currentUser = user.uid || user.email || "";

      if (!trackedUser || trackedUser !== currentUser) {
        resetTimer();
        return;
      }

      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (lastActivity) {
        const diff = Date.now() - parseInt(lastActivity);
        if (diff > INACTIVITY_TIMEOUT) {
          logout();
        }
      } else {
        resetTimer();
      }
    };

    // Eventos para detectar actividad
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((name) => document.addEventListener(name, resetTimer));

    // Verificar cada minuto si ha excedido el tiempo
    const interval = setInterval(checkInactivity, 60000);

    // Al iniciar una nueva sesión del usuario actual, reiniciar actividad para evitar cierres inmediatos
    resetTimer();

    return () => {
      events.forEach((name) => document.removeEventListener(name, resetTimer));
      clearInterval(interval);
    };
  }, [user]);

  // Detectar sesión de Firebase
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (!firebaseUser) {
        setUser(null);
        setUserData(null);
        setLoading(false);
        return;
      }

      setUser({
        type: "firebase",
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || null
      });

      try {
        if (firebaseUser.email === "admin@costaricacc.com") {
          setUserData({ rol: "administrador", email: firebaseUser.email, nombre: "Administrador" });
        } else {
          const snap = await get(ref(db, `usuarios/${firebaseUser.uid}`));
          if (!isMounted) return;

          if (snap.exists()) {
            setUserData(snap.val());
          } else {
            const newUser = {
              nombre: firebaseUser.displayName || firebaseUser.email,
              email: firebaseUser.email,
              rol: "cliente"
            };
            await set(ref(db, `usuarios/${firebaseUser.uid}`), newUser);
            await set(ref(db, `solicitantes/${firebaseUser.uid}`), newUser);
            if (!isMounted) return;
            setUserData(newUser);
          }
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("[AuthContext] Error cargando/creando datos de usuario:", err);
        setUserData({
          nombre: firebaseUser.displayName || firebaseUser.email,
          email: firebaseUser.email,
          rol: "cliente"
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
    // eslint-disable-next-line
  }, []);

  // Logout unificado
  const logout = async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    localStorage.removeItem(LAST_ACTIVITY_USER_KEY);
    setUser(null);
    setUserData(null);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
