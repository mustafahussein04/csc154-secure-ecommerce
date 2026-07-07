#include <stdio.h>
#include <string.h>

/* safe bounds checking of username */
void handle_username(const char *input) {
    char username[16];
    strncpy(username, input, sizeof(username) - 1);
    username[sizeof(username) - 1] = '\0';
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