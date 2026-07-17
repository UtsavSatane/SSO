const cache = require('./cache');

class RedisAdapter {
  constructor(name) {
    this.name = name;
  }

  key(id) {
    return `oidc:${this.name}:${id}`;
  }

  async find(id) {
    const key = this.key(id);
    const payload = await cache.get(key);
    console.log(`[Adapter debug] FIND model=${this.name} id=${id} found=${!!payload}`);
    if (!payload) return undefined;
    return payload;
  }

  async findByUserCode(userCode) {
    console.log(`[Adapter debug] FINDBYUSERCODE model=${this.name} userCode=${userCode}`);
    const id = await cache.get(`oidc:userCode:${userCode}`);
    if (!id) return undefined;
    return this.find(id);
  }

  async findByUid(uid) {
    console.log(`[Adapter debug] FINDBYUID model=${this.name} uid=${uid}`);
    const id = await cache.get(`oidc:uid:${uid}`);
    if (!id) return undefined;
    return this.find(id);
  }

  async upsert(id, payload, expiresIn) {
    const key = this.key(id);
    console.log(`[Adapter debug] UPSERT model=${this.name} id=${id} expiresIn=${expiresIn}s`);
    
    // Ensure expiresIn is a valid positive integer if provided
    let ttl = undefined;
    if (expiresIn) {
      ttl = Math.max(1, Math.floor(expiresIn));
    }

    await cache.set(key, payload, ttl);

    if (payload.uid) {
      await cache.set(`oidc:uid:${payload.uid}`, id, ttl);
    }

    if (payload.userCode) {
      await cache.set(`oidc:userCode:${payload.userCode}`, id, ttl);
    }

    if (payload.grantId) {
      const grantKey = `oidc:grant:${payload.grantId}`;
      await cache.client.sadd(grantKey, key);
      if (ttl) {
        await cache.client.expire(grantKey, ttl);
      }
    }
  }

  async consume(id) {
    console.log(`[Adapter debug] CONSUME model=${this.name} id=${id}`);
    const payload = await this.find(id);
    if (payload) {
      payload.consumed = true;
      const key = this.key(id);
      const ttl = await cache.client.ttl(key);
      const finalTtl = ttl > 0 ? ttl : undefined;
      await cache.set(key, payload, finalTtl);
    }
  }

  async destroy(id) {
    console.log(`[Adapter debug] DESTROY model=${this.name} id=${id}`);
    const payload = await this.find(id);
    const key = this.key(id);
    await cache.delete(key);

    if (payload) {
      if (payload.uid) {
        await cache.delete(`oidc:uid:${payload.uid}`);
      }
      if (payload.userCode) {
        await cache.delete(`oidc:userCode:${payload.userCode}`);
      }
    }
  }

  async revokeByGrantId(grantId) {
    console.log(`[Adapter debug] REVOKEBYGRANTID grantId=${grantId}`);
    const grantKey = `oidc:grant:${grantId}`;
    const keys = await cache.client.smembers(grantKey);
    if (keys && keys.length > 0) {
      for (const k of keys) {
        await cache.delete(k);
      }
    }
    await cache.delete(grantKey);
  }
}

module.exports = RedisAdapter;
