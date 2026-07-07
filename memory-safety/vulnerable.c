#include <stdio.h>
#include <string.h>

/* unsafe on purpose */
void handle_username(const char *input) {
    char username[16];
    strcpy(username, input);
    printf("Registered username: %s\n", username);
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <username>\n", argv[0]);
        return 1;
    }
    handle_username(argv[1]);
    return 0;
}