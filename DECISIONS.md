WHY KAFKA AND NOT JUST A SIMPLE QUEUE

I went with Kafka instead of RabbitMQ or AWS SQS for handling the 
buy-now events.

Main reason - RabbitMQ deletes a message once someone reads it. So if 
my consumer code has a bug and processes things wrong, I can't go back 
and redo it, the data is just gone. Kafka keeps everything for a few 
days even after it's been read, so I can rewind and reprocess if 
something breaks. That mattered a lot to me since I'm new to this and 
will probably mess up the consumer logic at least once.

Also didn't want SQS because it needs AWS and costs money per message, 
and I'm building this entirely on free tools with Docker on my own 
laptop, no cloud account involved.

Yeah it's probably more than what a small project like mine actually 
needs throughput-wise but I wanted to build it the way it'd actually 
work at real scale, not just the minimum to make my demo pass.

If someone asks why I didn't just use a basic queue: because the real 
system this is based on needs to replay events and split work across 
multiple partitions at like 100k events a second, and I wanted my 
architecture to actually reflect that even if my own test load is way 
smaller.


WHY REDIS AND NOT MEMCACHED

For the lock and the stock counter I used Redis, not Memcached.

Memcached doesn't have a proper "only set this if it doesn't already 
exist" command. So two requests could both check at the same time, 
both see the lock is free, and both grab it - which is literally the 
same bug I was trying to fix in the first place (two people buying 
the last item at once). Also if Memcached restarts everything's just 
gone, no backup.

Redis has SETNX which locks it in one atomic step with an auto expiry, 
and HINCRBY which decrements the stock count atomically too. Both of 
these are single operations, nothing in between for another request to 
sneak through.

If asked why not just use Memcached since it's simpler and also fast - 
speed wasn't really the issue, they're both basically instant. The real 
issue was that Memcached doesn't give me an atomic way to do the lock 
safely, so I'd have had to write extra logic myself to fake it, and 
that extra logic is exactly where bugs like the original race condition 
creep back in. Redis just handles both the lock and the counter 
natively without me needing to trust my own code to get the timing right.

WHY I USED KAFKA-PYTHON-NG

First i tried confluent-kafka because that's what everyone uses for kafka 
in python. but install failed on windows, it needs to compile some c code 
and my system didnt have a windows sdk file called io.h. could have fixed 
it but that meant installing more visual studio stuff just for this, felt 
like too much for now.

then tried kafka-python which is pure python so no compiling needed. this 
installed fine but broke when i actually ran it. turned out this library 
is old and not updated properly, it has some broken internal six library 
which doesnt work with python 3.13 which is what i have.

finally used kafka-python-ng, it's basically the same library but someone 
else maintained and fixed it for newer python. same code worked instantly 
after switching to this one.

so yeah took 3 tries to get one working kafka library lol but now it 
actually sends events properly to my kafka topic.

PRODUCER THROUGHPUT TUNING

Tested 3 configs sending 5000 events each:
- default settings: 10528 events/sec
- bigger batch (32kb) + linger 10ms: 9629 events/sec (got slower!)
- bigger batch (32kb) + linger 0ms: 13393 events/sec (best)

turns out linger.ms actually made things worse here. makes sense once i 
thought about it - my producer sends events so fast that batches were 
already filling up instantly, so telling kafka to "wait a bit to fill 
the batch" just added pure delay with nothing to gain. linger only helps 
if events trickle in slower than the wait window, not in a tight burst 
like my throughput test.

keeping batch_size=32768, linger_ms=0 as final producer config.

KAFKA DUAL LISTENERS (host + docker)

problem: my producer runs on windows host, consumer runs inside docker. 
when kafka advertised itself as just "kafka:9092", the consumer could 
connect but my host producer couldn't - "kafka" hostname doesn't exist 
outside docker. when it advertised "localhost:9092", host worked but 
the in-docker consumer broke. couldn't make both work with one listener.

fix: two listeners on different ports. INTERNAL://kafka:9092 for 
containers, EXTERNAL://localhost:29092 for my host producer. same kafka, 
two doors. producer connects on 29092, consumer on 9092, both reach the 
same broker.

took a while to figure out the symptom - producer said "Sent" but 
consumer never got anything and stock never dropped, because delivery 
was silently failing to a hostname the host couldn't resolve.