<template>
  <div class="row" :class="justification">
    <div v-for="(card, idx) in cards" class="col-auto pt-2 pb-3" :key="idx">
      <div @click="cardClicked(card.id || idx)" class="card card-overlay" :class="cardClass(card.id || idx)">
        <template v-if="getImage(card)">
          <img v-if="contentType === 'image'" class="card-img-top card-img-fixed" :src="getImage(card)"
               :alt="card.name">
          <video v-else-if="contentType === 'video'" autoplay loop class="embed-responsive-item">
            <source :src="getImage(card)" type="video/mp4">
          </video>
        </template>
        <template v-else>
          <img v-if="contentType === 'image'" class="card-img-top card-img-fixed" :src="placeholder()"
               :alt="card.name">
        </template>
        <div class="card-body p-2">
          <p :class="{'card-title': cardSize === 'standard', 'card-text': cardSize === 'smaller'}">
            <span v-if="showId && card.id">{{ shorten(card.id, 5) }}: </span>{{ shorten(card.name, 30) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import {shorten, placeholder} from "../utilities";

export default {
  name: "CardDeck",
  props: ['cards', 'justification', 'cardSize', 'choice', 'showId', 'contentType'],
  methods: {
    cardClicked(id) {
      this.$emit('cardClicked', id)
    },
    getImage(card) {
      return card.localImage || card.image
    },
    cardClass(idx) {
      return {
        'chosen-card': this.choice.indexOf(idx) !== -1,
        'choosable-card': this.choice.indexOf(idx) === -1,
        'standard-card-size': this.cardSize === 'standard',
        'smaller-card-size': this.cardSize === 'smaller'
      }
    },
    placeholder,
    shorten
  }
}
</script>

<style scoped>
.standard-card-size {
    height: 242px;
    width: 168px;
}

.smaller-card-size {
    height: 200px;
    width: 137px;
}

.chosen-card {
    border-color: #43F097;
    border-width: 2px;
}

.rounded-16 {
    border-radius: 16px !important;
}

.card-overlay {
    background: linear-gradient(0deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05)), #121212;
    box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    color: #dedede;
}

.card-body {
  max-height: 56px;
}
</style>