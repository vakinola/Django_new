from django.urls import path
from . import views

urlpatterns = [
    path("", views.home, name="root"),
    path("home", views.home, name="home"),
    path("register", views.register_user, name="register"),
    path("login", views.login_user, name="login"),
    path("logout", views.logout_user, name="logout"),
    path("upload_notebook", views.upload_notebook, name="upload_notebook"),
    path("init_upload", views.init_upload, name="init_upload"),
    path("upload", views.upload, name="upload"),
    path("progress/<str:job_id>", views.get_progress, name="get_progress"),

    
    path("summary", views.get_summary, name="get_summary"),
    path("ask", views.ask, name="ask"),
    path("generate_quiz", views.generate_quiz, name="generate_quiz"),


    path("save_result", views.save_result, name="save_result"),
    path("results", views.results, name="results"),


    path("delete_doc", views.delete_doc, name="delete_doc"),


    path("send-feedback", views.send_feedback, name="send_feedback"),


    path("privacy-policy/", views.privacy_policy, name="privacy_policy"),
    path("terms-of-service/", views.terms_of_service, name="terms_of_service"),

    path("accounts/password-reset/", views.password_reset_request, name="password_reset"),
    path("accounts/password-reset/confirm/<uidb64>/<token>/", views.password_reset_confirm, name="password_reset_confirm"),
    path("accounts/password-reset/complete/", views.password_reset_complete, name="password_reset_complete"),

    path("auth/google/", views.google_login, name="google_login"),
    path("auth/google/callback", views.google_callback, name="google_callback"),
]
