"""
THERMOSENSE - HTML Rendering Utility
Safely renders HTML markup in Streamlit without triggering CommonMark
4-space indentation code block parsing.
"""

import streamlit as st
import textwrap

def render_html(html_str: str):
    """
    Renders pure HTML without Markdown indentation code-block parsing.
    Strips leading common indentation via textwrap.dedent.
    """
    clean_html = textwrap.dedent(html_str).strip()
    if hasattr(st, "html"):
        st.html(clean_html)
    else:
        st.markdown(clean_html, unsafe_allow_html=True)
