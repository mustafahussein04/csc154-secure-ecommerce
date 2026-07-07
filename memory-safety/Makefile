CC = cc
CFLAGS = -Wall -fstack-protector-all -pie -fPIE -O0
LDFLAGS = -pie

all: vulnerable safe

vulnerable: vulnerable.c
	$(CC) $(CFLAGS) -o vulnerable vulnerable.c $(LDFLAGS)

safe: safe.c
	$(CC) $(CFLAGS) -o safe safe.c $(LDFLAGS)

clean:
	rm -f vulnerable safe

.PHONY: all clean