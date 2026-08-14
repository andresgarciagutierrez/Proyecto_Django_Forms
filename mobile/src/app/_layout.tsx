import "../../global.css";

import {
  ReactNode,
  useEffect,
} from "react";

import {
  ActivityIndicator,
  View,
} from "react-native";

import {
  Stack,
  useRouter,
  useSegments,
} from "expo-router";

import {
  AuthProvider,
  useAuth,
} from "../context/AuthContext";

// ==========================================================
// RUTAS PÚBLICAS
// ==========================================================

function isPublicRoute(
  segments: string[]
): boolean {
  const first = segments[0];

  return (
    first === "login" ||
    first === "forms"
  );
}

// ==========================================================
// GUARD DE AUTENTICACIÓN
// ==========================================================

function RouteGuard({
  children,
}: {
  children: ReactNode;
}) {
  const {
    token,
    loading,
  } = useAuth();

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    const publicRoute =
      isPublicRoute(segments);

    if (!token && !publicRoute) {
      router.replace("/login");
    }
  }, [
    token,
    loading,
    segments,
    router,
  ]);

  if (loading) {
    return (
      <View className="flex-1 health-bg items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

// ==========================================================
// ROOT LAYOUT
// ==========================================================

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </RouteGuard>
    </AuthProvider>
  );
}