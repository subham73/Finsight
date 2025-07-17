from onelogin.saml2.auth import OneLogin_Saml2_Auth
from fastapi import Request
from starlette.requests import Request as StarletteRequest

async def prepare_request(request: StarletteRequest):
    # Convert FastAPI request to dict format expected by python3-saml
    return {
        'https': 'on' if request.url.scheme == 'https' else 'off',
        'http_host': request.url.hostname,
        'server_port': request.url.port,
        'script_name': request.url.path,
        'get_data': request.query_params,
        'post_data': await request.form()
    }

def init_saml_auth(request: Request):
    req_data = prepare_request(request)
    return OneLogin_Saml2_Auth(req_data, custom_base_path="app/saml") #TODO:change it to 

# click login via sso -> authenticate with Idp -> idp sends a saml response ->

# ibrahim -> server maachine, 