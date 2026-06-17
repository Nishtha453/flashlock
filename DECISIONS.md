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