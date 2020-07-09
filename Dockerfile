FROM ruby:2.6-slim

EXPOSE 4567
WORKDIR /srv/slate

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential nodejs \
    && gem install bundler

COPY Gemfile Gemfile.lock /srv/slate/
RUN  bundle install
COPY . /srv/slate

CMD ["bundle", "exec", "middleman", "server", "--watcher-force-polling"]
