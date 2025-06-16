def get_prompt(user_input: str, initial_prompt_suffix: str) -> str:
    return f"{initial_prompt_suffix}\nUser: {user_input}\nAssistant:"

processing_query_fillers = [
    "Hmm, let me see...",
    "Let me think about this for a bit.",
    "Just a second, I'm processing your question.",
    "Okay, let's figure this out together.",
    "Interesting! Let me look into that for you.",
    "Hold on a moment, Im gathering the details.",
    "Good question, let me consider this for a moment.",
]
