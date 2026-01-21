
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref, get, set } from "firebase/database";
import { msalInstance } from "./MicrosoftAuth";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

const INACTIVITY_TIMEOUT = 2 * 60 * 60 * 1000; // 2 horas en milisegundos

export function useAuth() {
  return useContext(AuthContext);
}


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // { type: 'firebase'|'microsoft', ...user }
  const [userData, setUserData] = useState(null); // datos extendidos
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Gestión de inactividad
  useEffect(() => {
    if (!user) return;

    const resetTimer = () => {
      localStorage.setItem("lastActivity", Date.now().toString());
    };

    const checkInactivity = () => {
      const lastActivity = localStorage.getItem("lastActivity");
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

    // Verificación inmediata al cargar/cambiar usuario (cubre si el navegador estuvo cerrado)
    checkInactivity();

    return () => {
      events.forEach((name) => document.removeEventListener(name, resetTimer));
      clearInterval(interval);
    };
  }, [user]);

  // Detectar sesión de Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          type: "firebase",
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || null
        });
        // admin@costaricacc.com siempre es admin
        if (firebaseUser.email === "admin@costaricacc.com") {
          setUserData({ rol: "administrador", email: firebaseUser.email, nombre: "Administrador" });
        } else {
          const snap = await get(ref(db, `usuarios/${firebaseUser.uid}`));
          if (snap.exists()) {
            setUserData(snap.val());
          } else {
            setUserData(null);
          }
        }
        setLoading(false);
      } else {
        // Si no hay usuario de Firebase, verificar Microsoft
        checkMicrosoftSession();
      }
    });
    return unsubscribe;
    // eslint-disable-next-line
  }, []);

  // Verificar sesión Microsoft (MSAL)
  const checkMicrosoftSession = async () => {
    try {
      await msalInstance.initialize();
      const accounts = msalInstance.getAllAccounts();
      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        const userId = account.homeAccountId.replace(/\W/g, "");
        setUser({
          type: "microsoft",
          uid: userId,
          email: account.username,
          displayName: account.name || account.username
        });
        // Buscar datos extendidos en la base de datos
        const userRef = ref(db, `usuarios/${userId}`);
        const solRef = ref(db, `solicitantes/${userId}`);
        const snap = await get(userRef);
        if (snap.exists()) {
          setUserData(snap.val());
        } else {
          // Crear usuario en usuarios y solicitantes con rol "areas" por defecto
          const newUser = {
            nombre: account.name || account.username,
            email: account.username,
            rol: "areas"
          };
          await set(userRef, newUser);
          await set(solRef, newUser);
          setUserData(newUser);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
    } catch (e) {
      setUser(null);
      setUserData(null);
    }
    setLoading(false);
  };

  // Logout unificado
  const logout = async () => {
    if (user?.type === "firebase") {
      await firebaseSignOut(auth);
      setUser(null);
      setUserData(null);
      navigate("/login");
    } else if (user?.type === "microsoft") {
      // Cerrar sesión MSAL y limpiar cuentas
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        await msalInstance.logoutPopup({ account: accounts[0] });
      }
      setUser(null);
      setUserData(null);
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
