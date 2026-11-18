from fastapi.testclient import TestClient


def test_create_list_search_and_filter_bugs(
    client: TestClient,
    auth_headers_regular: dict,
):
    me_res = client.get("/user/me/id", headers=auth_headers_regular)
    my_id = me_res.json()["id"]

    # Crear bug crítico (severidad 5, abierto)
    b1 = client.post(
        "/bug",
        headers=auth_headers_regular,
        json={
            "title": "Fallo crítico en pasarela de checkout",
            "description": "El webhook rechaza firmas válidas.",
            "module": "Checkout",
            "severity": 5,
            "is_resolved": False,
        },
    )
    assert b1.status_code == 201
    bug_id = b1.json()["id"]

    # Crear bug menor ya resuelto
    b2 = client.post(
        "/bug",
        headers=auth_headers_regular,
        json={
            "title": "Icono desalineado en barra lateral",
            "description": "Padding de 4px faltante.",
            "module": "UI",
            "severity": 2,
            "is_resolved": True,
        },
    )
    assert b2.status_code == 201

    # Verificar que el reporter_id se tomó automáticamente del token JWT del usuario logueado
    detail_res = client.get(f"/bug/{bug_id}", headers=auth_headers_regular)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["reporter_id"] == my_id
    assert detail["reporter"]["name"] == "QA Tester Uno"

    # Listado general
    list_res = client.get("/bug", headers=auth_headers_regular)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 2

    # Búsqueda por título
    search_res = client.get("/bug/search/checkout", headers=auth_headers_regular)
    assert search_res.status_code == 200
    assert len(search_res.json()) == 1

    # Filtro de bugs críticos abiertos (/bug/filter/critical)
    crit_res = client.get("/bug/filter/critical", headers=auth_headers_regular)
    assert crit_res.status_code == 200
    assert len(crit_res.json()) == 1
    assert crit_res.json()[0]["severity"] == 5


def test_update_and_delete_bug_permissions(
    client: TestClient,
    auth_headers: dict,
    auth_headers_regular: dict,
):
    created = client.post(
        "/bug",
        headers=auth_headers_regular,
        json={
            "title": "Timeout en consulta de reportes",
            "description": "Demora más de 10s.",
            "module": "Reportes",
            "severity": 4,
            "is_resolved": False,
        },
    )
    bug_id = created.json()["id"]

    # TESTER puede actualizar un bug (tiene update_bugs)
    upd_res = client.patch(
        f"/bug/{bug_id}",
        headers=auth_headers_regular,
        json={
            "title": "Timeout en consulta de reportes (Resuelto)",
            "description": "Se agregó índice en base de datos.",
            "module": "Reportes",
            "severity": 4,
            "is_resolved": True,
        },
    )
    assert upd_res.status_code == 200

    # TESTER NO puede borrar bugs (no tiene delete_bugs -> 403)
    del_forbidden = client.delete(f"/bug/{bug_id}", headers=auth_headers_regular)
    assert del_forbidden.status_code == 403
    assert "delete_bugs" in del_forbidden.json()["detail"]

    # ADMIN sí puede borrar bugs
    del_ok = client.delete(f"/bug/{bug_id}", headers=auth_headers)
    assert del_ok.status_code == 200

    not_found = client.get(f"/bug/{bug_id}", headers=auth_headers)
    assert not_found.status_code == 404
