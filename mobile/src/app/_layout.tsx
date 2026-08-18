import "../../global.css";

import { ReactNode, useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";

import { AuthProvider, useAuth } from "../context/AuthContext";

// Rutas públicas: "/" (en tránsito hacia /forms, segments === []),
// /forms (listado), /forms/[id] (diligenciar). /forms/new y
// /forms/[id]/edit requieren sesión.
function isPublicRoute(segments: string[]): boolean {
  if (segments.length === 0) return true;

  const [first, second, third] = segments;

  if (first === "login" || first === "register") return true;
  if (first !== "forms") return false;

  if (second === "new") return false;
  if (third === "edit") return false;

  return true;
}

function RouteGuard({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const publicRoute = isPublicRoute(segments);

    if (!token && !publicRoute) {
      router.replace("/login");
    }
  }, [token, loading, segments, router]);

  if (loading) {
    return (
      <View className="flex-1 health-bg items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </RouteGuard>
    </AuthProvider>
  );
}