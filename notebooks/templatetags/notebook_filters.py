# notebooks/templatetags/notebook_filters.py
import re
from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def markdown_bold(s):
    if not isinstance(s, str):
        return s
    return mark_safe(re.sub(r"\*\*(.*?)\*\*", r"<strong>\1</strong>", s))


@register.filter
def nl2br(s):
    if not isinstance(s, str):
        return s
    return mark_safe(s.replace("\n", "<br>"))
