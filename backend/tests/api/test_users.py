from fastapi.testclient import TestClient


def test_get_users_and_detail(client: TestClient, auth_headers: dict):
    res = client.get("/user", headers=auth_headers)
    assert res.status_code == 200
    users = res.json()
    assert len(users) == 1

    user_id = users[0]["id"]
    detail = client.get(f"/user/{user_id}", headers=auth_headers)
    assert detail.status_code == 200
    assert detail.json()["email"] == "admin@qastudio.com"
    assert detail.json()["country"]["name"] == "Argentina"


def test_search_and_senior_testers_filter(
    client: TestClient,
    auth_headers: dict,
    auth_headers_regular: dict,
):
    search_res = client.get("/user/search/Lead", headers=auth_headers)
    assert search_res.status_code == 200
    assert len(search_res.json()) == 1

    # Lead QA Admin tiene 30 años (>= 25) y QA Tester Uno tiene 24 (< 25)
    seniors_res = client.get("/user/filter/seniors", headers=auth_headers)
    assert seniors_res.status_code == 200
    assert len(seniors_res.json()) == 1
    assert seniors_res.json()[0]["name"] == "Lead QA Admin"


def test_create_update_delete_user_as_admin(client: TestClient, auth_headers: dict):
    create_res = client.post(
        "/user",
        headers=auth_headers,
        json={
            "name": "Analista QA",
            "age": 29,
            "country_id": 2,
            "email": "analista@qastudio.com",
            "password": "1234",
        },
    )
    assert create_res.status_code == 200
    uid = create_res.json()["id"]

    update_res = client.patch(
        f"/user/{uid}",
        headers=auth_headers,
        json={
            "name": "Analista QA Senior",
            "age": 31,
            "country_id": 1,
            "email": "analista@qastudio.com",
            "password": "sin-cambios",
        },
    )
    assert update_res.status_code == 200

    detail = client.get(f"/user/{uid}", headers=auth_headers)
    assert detail.json()["name"] == "Analista QA Senior"
    assert detail.json()["age"] == 31

    del_res = client.delete(f"/user/{uid}", headers=auth_headers)
    assert del_res.status_code == 200

    not_found = client.get(f"/user/{uid}", headers=auth_headers)
    assert not_found.status_code == 404


def test_regular_tester_cannot_create_or_delete_users(
    client: TestClient,
    auth_headers_regular: dict,
):
    create_res = client.post(
        "/user",
        headers=auth_headers_regular,
        json={
            "name": "No Autorizado",
            "age": 20,
            "country_id": 1,
            "email": "noauth@qastudio.com",
            "password": "1234",
        },
    )
    assert create_res.status_code == 403
    assert "write_users" in create_res.json()["detail"]

    del_res = client.delete("/user/1", headers=auth_headers_regular)
    assert del_res.status_code == 403
    assert "delete_users" in del_res.json()["detail"]


def test_assign_and_remove_admin_role_from_user(
    client: TestClient,
    auth_headers: dict,
    auth_headers_regular: dict,
):
    roles_res = client.get("/role", headers=auth_headers)
    assert roles_res.status_code == 200
    admin_role = next(r for r in roles_res.json() if r["name"] == "ADMIN")

    # El Admin asigna rol ADMIN al usuario 2
    add_res = client.post(f"/user/2/role/{admin_role['id']}", headers=auth_headers)
    assert add_res.status_code == 200
    role_names = [r["name"] for r in add_res.json()["roles"]]
    assert "ADMIN" in role_names

    # El Admin quita rol ADMIN al usuario 2
    rem_res = client.delete(f"/user/2/role/{admin_role['id']}", headers=auth_headers)
    assert rem_res.status_code == 200
    role_names_after = [r["name"] for r in rem_res.json()["roles"]]
    assert "ADMIN" not in role_names_after
