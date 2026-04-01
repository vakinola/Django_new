from django.contrib import admin
from django.contrib.auth.admin import GroupAdmin, UserAdmin
from django.contrib.auth.models import Group, User
from django.contrib.sessions.models import Session


admin.site.site_header = "StudyAssists Admin"
admin.site.site_title = "StudyAssists Admin"
admin.site.index_title = "Administration"


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("session_key", "expire_date")
    search_fields = ("session_key",)
    ordering = ("-expire_date",)


admin.site.unregister(User)


@admin.register(User)
class StudyAssistUserAdmin(UserAdmin):
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "is_staff",
        "is_active",
        "date_joined",
    )
    list_filter = ("is_staff", "is_superuser", "is_active", "groups")
    search_fields = ("username", "email", "first_name", "last_name")
    ordering = ("-date_joined",)


admin.site.unregister(Group)
admin.site.register(Group, GroupAdmin)
