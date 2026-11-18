from fastapi.testclient import TestClient


def test_get_countries_public(client: TestClient, seed):
    res = client.get("/country")
    assert res.status_code == 200
    data = res.json()
    names = [c["name"] for c in data]
    assert "Argentina" in names
    assert "Uruguay" in names
    assert "Brasil" in names


def test_first_registered_user_is_admin_and_second_is_tester(client: TestClient, seed):
    # 0. Antes de registrar a nadie, setup-status indica has_users = False
    status_before = client.get("/auth/setup-status")
    assert status_before.status_code == 200
    assert status_before.json()["has_users"] is False

    # 1. Primer usuario registrado -> debe ser ADMIN por defecto
    first_reg = client.post(
        "/register",
        json={
            "name": "Primer Usuario Admin",
            "age": 28,
            "country_id": 1,
            "email": "primero@qastudio.com",
            "password": "secretpassword",
        },
    )
    assert first_reg.status_code == 201
    first_id = first_reg.json()["id"]

    status_after = client.get("/auth/setup-status")
    assert status_after.json()["has_users"] is True

    first_login = client.post(
        "/login",
        json={"email": "primero@qastudio.com", "password": "secretpassword"},
    )
    assert first_login.status_code == 200
    first_headers = {"Authorization": f"Bearer {first_login.json()['token']}"}

    first_detail = client.get(f"/user/{first_id}", headers=first_headers)
    assert first_detail.status_code == 200
    first_roles = [r["name"] for r in first_detail.json()["roles"]]
    assert "ADMIN" in first_roles

    # 2. Segundo usuario registrado -> debe ser TESTER por defecto
    second_reg = client.post(
        "/register",
        json={
            "name": "Segundo Usuario Tester",
            "age": 23,
            "country_id": 2,
            "email": "segundo@qastudio.com",
            "password": "secretpassword",
        },
    )
    assert second_reg.status_code == 201
    second_id = second_reg.json()["id"]

    second_detail = client.get(f"/user/{second_id}", headers=first_headers)
    assert second_detail.status_code == 200
    second_roles = [r["name"] for r in second_detail.json()["roles"]]
    assert "TESTER" in second_roles
    assert "ADMIN" not in second_roles

    # 3. El ADMIN puede otorgarle privilegio de ADMIN al segundo usuario
    roles_list = client.get("/role", headers=first_headers).json()
    admin_role = next(r for r in roles_list if r["name"] == "ADMIN")
    promote_res = client.post(
        f"/user/{second_id}/role/{admin_role['id']}",
        headers=first_headers,
    )
    assert promote_res.status_code == 200
    promoted_roles = [r["name"] for r in promote_res.json()["roles"]]
    assert "ADMIN" in promoted_roles


def test_register_duplicate_email_fails(client: TestClient, auth_headers: dict):
    dup_res = client.post(
        "/register",
        json={
            "name": "Duplicado",
            "age": 30,
            "country_id": 1,
            "email": "admin@qastudio.com",
            "password": "secretpassword",
        },
    )
    assert dup_res.status_code == 400
    assert dup_res.json()["detail"] == "Email already registered"


def test_login_invalid_credentials(client: TestClient, auth_headers: dict):
    res = client.post("/login", json={"email": "admin@qastudio.com", "password": "wrong"})
    assert res.status_code == 401
    assert res.json()["detail"] == "User/password incorrect"


def test_protected_endpoint_without_or_invalid_token(client: TestClient, seed):
    res_no_token = client.get("/user")
    assert res_no_token.status_code == 401

    res_bad_token = client.get("/user", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert res_bad_token.status_code == 401
    assert res_bad_token.json()["detail"] == "Invalid or expired token"
