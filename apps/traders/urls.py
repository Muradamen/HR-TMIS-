from django.urls import path

from . import views

app_name = "traders"

urlpatterns = [
    path(
        "register/",
        views.register_trader,
        name="register",
    ),
    path(
        "register/legal/",
        views.register_legal,
        name="register_legal",
    ),
    path(
        "register/informal/",
        views.register_informal,
        name="register_informal",
    ),
    path(
        "<str:trader_id>/",
        views.trader_detail,
        name="detail",
    ),
]
