from rest_framework import permissions


class IsFormCreatorOrReadOnly(permissions.BasePermission):
    """
    Controla el acceso a los formularios.

    =========================================================
    USUARIO ANÓNIMO
    =========================================================

    GET:
        Permitido.

    HEAD:
        Permitido.

    OPTIONS:
        Permitido.

    POST:
        Denegado.

    PUT:
        Denegado.

    PATCH:
        Denegado.

    DELETE:
        Denegado.


    =========================================================
    USUARIO AUTENTICADO
    =========================================================

    GET:
        Permitido.

    POST:
        Permitido únicamente para:

        - Form Creators
        - Staff
        - Superuser

    PUT / PATCH / DELETE:

        - El creador del formulario.
        - Staff.
        - Superuser.


    =========================================================
    STAFF
    =========================================================

    Acceso completo.


    =========================================================
    SUPERUSER
    =========================================================

    Acceso completo.
    """

    def has_permission(self, request, view):
        # ==================================================
        # LECTURA PÚBLICA
        # ==================================================

        if request.method in permissions.SAFE_METHODS:
            return True

        # ==================================================
        # ESCRITURA REQUIERE AUTENTICACIÓN
        # ==================================================

        if not request.user.is_authenticated:
            return False

        # ==================================================
        # SUPERUSER
        # ==================================================

        if request.user.is_superuser:
            return True

        # ==================================================
        # STAFF
        # ==================================================

        if request.user.is_staff:
            return True

        # ==================================================
        # FORM CREATOR
        # ==================================================

        return request.user.groups.filter(name="Form Creators").exists()

    def has_object_permission(self, request, view, obj):
        # ==================================================
        # LECTURA PÚBLICA
        # ==================================================

        if request.method in permissions.SAFE_METHODS:
            return True

        # ==================================================
        # ESCRITURA REQUIERE AUTENTICACIÓN
        # ==================================================

        if not request.user.is_authenticated:
            return False

        # ==================================================
        # SUPERUSER
        # ==================================================

        if request.user.is_superuser:
            return True

        # ==================================================
        # STAFF
        # ==================================================

        if request.user.is_staff:
            return True

        # ==================================================
        # FORM CREATOR
        # ==================================================
        #
        # Solo puede modificar/eliminar sus propios
        # formularios.
        #

        return obj.created_by_id == request.user.id


class IsAuthenticatedOrReadOnly(permissions.BasePermission):
    """
    Permiso genérico:

    - Usuario autenticado: acceso.
    - Usuario anónimo: sin acceso.

    Actualmente no es necesario para los ViewSets
    principales, pero puede mantenerse para otros
    recursos que necesiten este comportamiento.
    """

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsResponseOwnerOrStaff(permissions.BasePermission):
    """
    Permisos para respuestas.

    =========================================================
    CREAR RESPUESTA
    =========================================================

    Público.

    Puede responder:

        - usuario anónimo
        - usuario autenticado
        - Form Creator
        - staff
        - superuser


    =========================================================
    CONSULTAR RESPUESTAS
    =========================================================

    Permitido para:

        - creador del formulario
        - staff
        - superuser


    =========================================================
    MODIFICAR / ELIMINAR
    =========================================================

    Permitido para:

        - creador del formulario
        - staff
        - superuser
    """

    def has_permission(self, request, view):
        # ==================================================
        # CREAR RESPUESTA
        # ==================================================
        #
        # Esta operación es pública.
        #

        if view.action == "create":
            return True

        # ==================================================
        # RESTO DE OPERACIONES
        # ==================================================
        #
        # Requieren autenticación.
        #

        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user

        # ==================================================
        # ANÓNIMO
        # ==================================================

        if not user.is_authenticated:
            return False

        # ==================================================
        # SUPERUSER
        # ==================================================

        if user.is_superuser:
            return True

        # ==================================================
        # STAFF
        # ==================================================

        if user.is_staff:
            return True

        # ==================================================
        # CREADOR DEL FORMULARIO
        # ==================================================
        #
        # Puede administrar las respuestas
        # de sus propios formularios.
        #

        return obj.form.created_by_id == user.id
