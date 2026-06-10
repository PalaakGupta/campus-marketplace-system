from typing import Any, Optional


def success(data: Any, meta: Optional[dict] = None) -> dict:
    response = {"success": True, "data": data}
    if meta:
        response["meta"] = meta
    return response


def error(code: str, message: str, details: Optional[dict] = None) -> dict:
    err = {"code": code, "message": message}
    if details:
        err["details"] = details
    return {"success": False, "error": err}


def paginated(data: Any, page: int, page_size: int,
              total: int) -> dict:
    return {
        "success": True,
        "data": data,
        "meta": {
            "page"    : page,
            "pageSize": page_size,
            "total"   : total,
            "hasMore" : (page * page_size) < total
        }
    }