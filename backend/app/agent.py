"""ADK entry point for Google Agent Platform / agents-cli."""
from google.adk.apps import App
from .adk_runtime import build_root_agent

root_agent = build_root_agent()
app = App(root_agent=root_agent, name="cinemind")
