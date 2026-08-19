import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import { router } from "expo-router";

import { deleteForm, fetchForms } from "../../api/forms";
import { useAuth } from "../../context/AuthContext";
import { extractList } from "../../utils/api";

type FormSummary = {
  id: number;
  title: string;
  description?: string | null;
  created_by?: string | null;
};

export default function FormsListScreen() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const {
    token,
    username,
    logout,
    isStaff,
    isSuperuser,
    canManageForms,
    canViewResponses,
  } = useAuth();

  const { width } = useWindowDimensions();
  const isWeb = width >= 768;

  // Sin sesión no administra nada; staff/superuser administran
  // cualquiera; el resto solo sus propios formularios.
  const canManageThisForm = useCallback(
    (form: FormSummary) => {
      if (!token) return false;
      if (isStaff || isSuperuser) return true;
      return Boolean(username && form.created_by && form.created_by === username);
    },
    [token, isStaff, isSuperuser, username]
  );

  const loadForms = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await fetchForms();

      if (__DEV__) {
        console.log("[FORMS] Formularios recibidos:", data);
      }

      const list = extractList<FormSummary>(data);
      setForms(Array.isArray(list) ? list : []);
    } catch (err: any) {
      console.error("[FORMS] ERROR:", {
        message: err?.message,
        code: err?.code,
        status: err?.response?.status,
        data: err?.response?.data,
        url: err?.config?.url,
        baseURL: err?.config?.baseURL,
      });

      const status = err?.response?.status;

      if (status === 401) {
        setError(
          token
            ? "La sesión ha expirado. Inicia sesión nuevamente."
            : "No se pudo verificar el acceso al listado de formularios."
        );
      } else if (status === 404) {
        setError("El servicio de formularios no está disponible.");
      } else if (
        err?.code === "ECONNABORTED" ||
        err?.message?.toLowerCase()?.includes("timeout")
      ) {
        setError("El servidor tardó demasiado en responder.");
      } else if (!err?.response) {
        setError(
          "No se pudo conectar con el servidor. Verifica la conexión y la URL de la API."
        );
      } else if (status >= 500) {
        setError("El servidor presentó un error. Intenta nuevamente más tarde.");
      } else {
        setError("No se pudieron cargar los formularios.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleRefresh = useCallback(() => {
    loadForms(true);
  }, [loadForms]);

  const handleLogout = useCallback(async () => {
    if (!token) return;

    try {
      await logout();
      router.replace("/login");
    } catch (err) {
      console.error("[FORMS] ERROR CERRANDO SESIÓN:", err);
    }
  }, [logout, token]);

  const handleLogin = useCallback(() => {
    router.push("/login");
  }, []);

  const handleRegister = useCallback(() => {
    router.push("/register");
  }, []);

  const handleNewForm = useCallback(() => {
    router.push("/forms/new");
  }, []);

  const handleViewResponses = useCallback(() => {
    router.push("/responses");
  }, []);

  const handleOpenForm = useCallback((formId: number) => {
    if (!formId) return;

    router.push({
      pathname: "/forms/[id]",
      params: { id: String(formId) },
    });
  }, []);

  const handleEditForm = useCallback((formId: number) => {
    router.push({
      pathname: "/forms/[id]/edit",
      params: { id: String(formId) },
    });
  }, []);

  const executeDelete = useCallback(async (formId: number) => {
    console.log("[FORMS] Confirmación aceptada, iniciando petición para ID:", formId);
    setDeletingId(formId);
    setError("");

    try {
      await deleteForm(formId);
      setForms((previous) => previous.filter((f) => f.id !== formId));
      console.log("[FORMS] Formulario eliminado exitosamente.");
    } catch (err: any) {
      console.error("[FORMS] ERROR ELIMINANDO DETALLE:", {
        status: err?.response?.status,
        data: err?.response?.data,
        message: err?.message,
        url: err?.config?.url,
      });

      setError(
        `Error al eliminar (${err?.response?.status || "Sin respuesta"}): ${
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "Verifica que tengas permisos suficientes."
        }`
      );
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleDelete = useCallback(
    (form: FormSummary) => {
      console.log("[FORMS] Intentando eliminar formulario ID:", form.id);
      
      const authorized = canManageThisForm(form);
      console.log("[FORMS] ¿Usuario autorizado para borrar?", authorized);

      if (!authorized) {
        if (Platform.OS === "web") {
          window.alert("No tienes permisos suficientes para eliminar este formulario.");
        } else {
          Alert.alert("Permiso Denegado", "No tienes permisos suficientes para eliminar este formulario.");
        }
        return;
      }

      if (Platform.OS === "web") {
        const confirmed = window.confirm(
          `¿Eliminar "${form.title}"? Esta acción no se puede deshacer.`
        );
        if (confirmed) {
          executeDelete(form.id);
        }
      } else {
        Alert.alert(
          "Eliminar formulario",
          `¿Eliminar "${form.title}"? Esta acción no se puede deshacer.`,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Eliminar",
              style: "destructive",
              onPress: () => executeDelete(form.id),
            },
          ]
        );
      }
    },
    [canManageThisForm, executeDelete]
  );

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0284c7" />
        <Text className="mt-3 text-sm text-slate-500">
          Cargando formularios...
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View
        style={{
          width: "100%",
          maxWidth: isWeb ? 1100 : undefined,
          alignSelf: "center",
          flex: 1,
        }}
      >
        <FlatList
          data={forms}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#0284c7"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: isWeb ? 24 : 16,
            paddingTop: isWeb ? 32 : 20,
            paddingBottom: 40,
          }}
          ListHeaderComponent={
            <View className="mb-5">
              <View className="bg-white rounded-2xl border border-slate-200 p-5">
                <View
                  className={
                    isWeb ? "flex-row items-center justify-between" : "flex-col"
                  }
                >
                  <View className="flex-1">
                    <View className="flex-row items-center flex-wrap">
                      <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
                      <Text className="text-xl font-bold text-slate-800">
                        Formularios disponibles
                      </Text>
                      <View className="ml-2 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-100">
                        <Text className="text-xs font-semibold text-sky-700">
                          {forms.length}{" "}
                          {forms.length === 1 ? "formulario" : "formularios"}
                        </Text>
                      </View>
                    </View>

                    <Text className="mt-2 text-sm text-slate-500">
                      Gestión e ingesta de datos para la recolección en campo.
                    </Text>

                    {token && username ? (
                      <Text className="mt-2 text-xs text-slate-400">
                        Sesión iniciada como{" "}
                        <Text className="font-semibold text-slate-600">
                          {username}
                        </Text>
                      </Text>
                    ) : null}
                  </View>

                  <View
                    className={
                      isWeb
                        ? "ml-5 flex-row items-center gap-2"
                        : "mt-4 flex-row flex-wrap items-center gap-2"
                    }
                  >
                    {token && canManageForms && (
                      <TouchableOpacity
                        onPress={handleNewForm}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Nuevo formulario"
                        className="px-4 py-2.5 rounded-xl bg-sky-600"
                      >
                        <Text className="text-sm font-semibold text-white">
                          + Nuevo
                        </Text>
                      </TouchableOpacity>
                    )}

                    {token && canViewResponses && (
                      <TouchableOpacity
                        onPress={handleViewResponses}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Ver respuestas"
                        className="px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50"
                      >
                        <Text className="text-sm font-semibold text-sky-600">
                          Respuestas
                        </Text>
                      </TouchableOpacity>
                    )}

                    {token ? (
                      <TouchableOpacity
                        onPress={handleLogout}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Cerrar sesión"
                        className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50"
                      >
                        <Text className="text-sm font-semibold text-rose-600">
                          Cerrar sesión
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={handleRegister}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel="Registrarse"
                          className="px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50"
                        >
                          <Text className="text-sm font-semibold text-sky-600">
                            Registrarse
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleLogin}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel="Iniciar sesión"
                          className="px-4 py-2.5 rounded-xl border border-sky-200 bg-sky-50"
                        >
                          <Text className="text-sm font-semibold text-sky-600">
                            Iniciar sesión
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>

              {error ? (
                <View className="mt-4 flex-row items-start bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-rose-700">
                      {error}
                    </Text>
                    <TouchableOpacity
                      onPress={() => loadForms()}
                      activeOpacity={0.7}
                      className="mt-3 self-start"
                    >
                      <Text className="text-sm font-semibold text-sky-600">
                        Reintentar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item }) => {
            const canManage = canManageThisForm(item);

            return (
              <TouchableOpacity
                onPress={() => handleOpenForm(item.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Abrir formulario ${item.title}`}
                className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-sky-500 p-5 mb-4"
                style={
                  isWeb
                    ? { boxShadow: "0px 2px 6px rgba(0,0,0,0.08)" }
                    : { elevation: 2 }
                }
              >
                <View className="flex-row items-start">
                  <View className="w-9 h-9 rounded-lg bg-sky-50 items-center justify-center mr-3">
                    <Text className="text-sky-600 text-base">▤</Text>
                  </View>

                  <View className="flex-1">
                    <Text
                      className="text-base font-bold text-slate-800"
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    <Text
                      className="text-sm text-slate-500 mt-2 leading-5"
                      numberOfLines={2}
                    >
                      {item.description || "Sin descripción proporcionada."}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 pt-3 border-t border-slate-100 flex-row items-center justify-between">
                  <Text className="text-xs font-medium text-slate-400">
                    Activo
                  </Text>

                  <View className="flex-row items-center gap-4">
                    {canManage && (
                      <>
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleEditForm(item.id);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text className="text-sm font-semibold text-slate-500">
                            Editar
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            console.log("[FORMS] Click detectado en botón Eliminar para ID:", item.id);
                            handleDelete(item);
                          }}
                          activeOpacity={0.7}
                          style={{ padding: 4 }}
                        >
                          <Text className="text-sm font-semibold text-rose-500">
                            {deletingId === item.id ? "Eliminando..." : "Eliminar"}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    <View className="flex-row items-center">
                      <Text className="text-sm font-semibold text-sky-600">
                        Diligenciar
                      </Text>
                      <Text className="text-sky-600 text-base ml-1">→</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !error ? (
              <View className="bg-white rounded-2xl border border-slate-200 p-10 items-center">
                <View className="w-12 h-12 rounded-2xl bg-sky-50 items-center justify-center mb-4">
                  <Text className="text-xl text-sky-600">▤</Text>
                </View>

                <Text className="text-lg font-bold text-slate-800 text-center">
                  No hay formularios creados
                </Text>
                <Text className="text-sm text-slate-500 text-center mt-2">
                  Aún no se ha registrado ningún formulario en el sistema.
                </Text>

                {token && canManageForms && (
                  <TouchableOpacity
                    onPress={handleNewForm}
                    activeOpacity={0.7}
                    className="mt-4"
                  >
                    <Text className="text-sm font-semibold text-sky-600">
                      Crear mi primer formulario →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}