from rest_framework import permissions


class IsFormCreatorOrReadOnly(permissions.BasePermission):
    """
    Controla el acceso a los formularios.

    - Lectura (GET/HEAD/OPTIONS): pública.
    - Escritura: requiere estar autenticado y ser
      Form Creator, staff o superuser.
    - Modificar/eliminar un formulario en particular:
      solo su creador, staff o superuser.
    """

    @staticmethod
    def _can_write(user):
        if not user.is_authenticated:
            return False
        return (
            user.is_superuser
            or user.is_staff
            or user.groups.filter(name="Form Creators").exists()
        )

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return self._can_write(request.user)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        user = request.user
        if not user.is_authenticated:
            return False

        return user.is_superuser or user.is_staff or obj.created_by_id == user.id


class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    """
    Permiso genérico: solo usuarios autenticados pueden escribir.

    Actualmente no es necesario para los ViewSets principales,
    pero puede mantenerse para otros recursos que necesiten
    este comportamiento.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsResponseOwnerOrStaff(permissions.BasePermission):
    """
    Permisos para respuestas.

    - Crear respuesta: público (anónimo, autenticado, staff, etc.).
    - Consultar / modificar / eliminar: creador del formulario,
      staff o superuser.
    """

    def has_permission(self, request, view):
        if view.action == "create":
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user.is_authenticated:
            return False

        return user.is_superuser or user.is_staff or obj.form.created_by_id == user.id
