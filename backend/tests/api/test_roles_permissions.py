from fastapi.testclient import TestClient


def test_roles_and_permissions_crud_and_nm(client: TestClient, auth_headers: dict):
    # Crear permiso nuevo
    perm_res = client.post(
        "/permission",
        headers=auth_headers,
        json={"name": "export_reports", "description": "Exportar reportes PDF"},
    )
    assert perm_res.status_code == 201
    perm_id = perm_res.json()["id"]

    # Crear rol nuevo
    role_res = client.post(
        "/role",
        headers=auth_headers,
        json={"name": "QA_LEAD", "description": "Líder de equipo QA"},
    )
    assert role_res.status_code == 201
    role_id = role_res.json()["id"]

    # Asignar permiso al rol (N:M RolePermission)
    assign_res = client.post(
        f"/role/{role_id}/permission/{perm_id}",
        headers=auth_headers,
    )
    assert assign_res.status_code == 200
    perms = [p["name"] for p in assign_res.json()["permissions"]]
    assert "export_reports" in perms

    # Quitar permiso del rol
    rem_res = client.delete(
        f"/role/{role_id}/permission/{perm_id}",
        headers=auth_headers,
    )
    assert rem_res.status_code == 200
    assert len(rem_res.json()["permissions"]) == 0

    # Usuarios del rol
    users_res = client.get(f"/role/{role_id}/user", headers=auth_headers)
    assert users_res.status_code == 200
    assert users_res.json() == []
