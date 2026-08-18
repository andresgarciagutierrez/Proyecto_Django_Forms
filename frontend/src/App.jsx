import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import FormsList from "./pages/FormsList";
import FormBuilder from "./pages/FormBuilder";
import FormResponder from "./pages/FormResponder";
import ResponsesView from "./pages/ResponsesView";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* AUTENTICACIÓN */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* FORMULARIOS
              /forms es público: un usuario sin sesión puede consultar
              formularios. */}
          <Route path="/forms" element={<FormsList />} />

          {/* CREAR FORMULARIO
              Requiere sesión y permiso formCreate. La validación final
              también debe hacerla el backend. */}
          <Route
            path="/forms/new"
            element={
              <ProtectedRoute requireFormCreate>
                <FormBuilder />
              </ProtectedRoute>
            }
          />

          {/* EDITAR FORMULARIO
              Requiere autenticación. La autorización de si puede editar
              ESE formulario en particular debe validarse también en el
              backend. */}
          <Route
            path="/forms/:id/edit"
            element={
              <ProtectedRoute>
                <FormBuilder />
              </ProtectedRoute>
            }
          />

          {/* DILIGENCIAR FORMULARIO
              Público, igual que /forms. Si quieres obligar a iniciar
              sesión para diligenciar, aquí se puede volver a
              ProtectedRoute. */}
          <Route path="/forms/:id" element={<FormResponder />} />

          {/* RESPUESTAS
              Requiere autenticación. */}
          <Route
            path="/responses"
            element={
              <ProtectedRoute>
                <ResponsesView />
              </ProtectedRoute>
            }
          />

          {/* RUTA DESCONOCIDA */}
          <Route path="*" element={<Navigate to="/forms" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;